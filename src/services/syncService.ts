import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OrdersRepository } from '../db/ordersRepository';
import { APP_CONFIG } from '../constants/config';
import { Order } from '../types/database';

export type SyncStatusState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncResult {
  ordersSynced: number;
  itemsSynced: number;
  success: boolean;
  error?: string;
}

type SyncListener = (status: SyncStatusState, pendingCount: number) => void;

export class SupabaseSyncService {
  private static instance: SupabaseSyncService | null = null;
  private supabase: SupabaseClient | null = null;
  private isOnline = false;
  private isSyncing = false;
  private currentStatus: SyncStatusState = 'offline';
  private unsubscribeNetInfo: (() => void) | null = null;
  private listeners: Set<SyncListener> = new Set();
  private pendingCount = 0;

  private constructor() {
    this.initSupabaseClient();
  }

  public static getInstance(): SupabaseSyncService {
    if (!SupabaseSyncService.instance) {
      SupabaseSyncService.instance = new SupabaseSyncService();
    }
    return SupabaseSyncService.instance;
  }

  private initSupabaseClient() {
    const url = APP_CONFIG.SUPABASE.URL;
    const key = APP_CONFIG.SUPABASE.ANON_KEY;
    if (url && key && url.startsWith('http')) {
      try {
        this.supabase = createClient(url, key, {
          auth: {
            persistSession: false,
          },
        });
      } catch (err) {
        // Fallback offline
      }
    }
  }

  /**
   * Inicia o monitoramento de rede e sincronização automática em background
   */
  public start(): void {
    if (this.unsubscribeNetInfo) return;

    try {
      this.unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
        const online = Boolean(state.isConnected && state.isInternetReachable !== false);
        this.handleConnectivityChange(online);
      });

      // Checagem inicial
      NetInfo.fetch().then((state) => {
        const online = Boolean(state.isConnected && state.isInternetReachable !== false);
        this.handleConnectivityChange(online);
      });
    } catch (e) {
      // Fallback para ambiente sem NetInfo nativo
      this.handleConnectivityChange(false);
    }
  }

  public stop(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }

  public getStatus(): { status: SyncStatusState; pendingCount: number; isOnline: boolean } {
    return {
      status: this.currentStatus,
      pendingCount: this.pendingCount,
      isOnline: this.isOnline,
    };
  }

  public onSyncChange(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus, this.pendingCount);
    return () => this.listeners.delete(listener);
  }

  private handleConnectivityChange(online: boolean) {
    this.isOnline = online;
    if (!online) {
      this.currentStatus = 'offline';
      this.notifyListeners();
    } else {
      // Conexão restaurada: disparar sincronização do Outbox
      this.syncOutbox();
    }
  }

  /**
   * Executa a sincronização Outbox Pattern:
   * 1. Consulta pedidos não sincronizados (synced = false)
   * 2. Faz upsert em lote no Supabase (com client-wins)
   * 3. Atualiza localmente para synced = true
   */
  public async syncOutbox(customSupabaseClient?: SupabaseClient): Promise<SyncResult> {
    if (this.isSyncing) {
      return { ordersSynced: 0, itemsSynced: 0, success: true };
    }

    const client = customSupabaseClient || this.supabase;
    const unsyncedOrders = await OrdersRepository.getUnsyncedOrders();
    this.pendingCount = unsyncedOrders.length;

    if (unsyncedOrders.length === 0) {
      this.currentStatus = this.isOnline ? 'synced' : 'offline';
      this.notifyListeners();
      return { ordersSynced: 0, itemsSynced: 0, success: true };
    }

    if (!client) {
      this.currentStatus = 'offline';
      this.notifyListeners();
      return { ordersSynced: 0, itemsSynced: 0, success: false, error: 'Supabase client not initialized' };
    }

    this.isSyncing = true;
    this.currentStatus = 'syncing';
    this.notifyListeners();

    try {
      let ordersSynced = 0;
      let itemsSynced = 0;

      // Montar payload em lote
      const ordersPayload = unsyncedOrders.map((o) => ({
        id: o.id,
        daily_number: o.daily_number,
        customer_name: o.customer_name,
        total: o.total,
        status: o.status,
        created_at: o.created_at,
        updated_at: new Date().toISOString(),
      }));

      const itemsPayload: any[] = [];
      const itemIds: string[] = [];
      for (const order of unsyncedOrders) {
        for (const item of order.items || []) {
          itemsPayload.push({
            id: item.id,
            order_id: item.order_id,
            product_id: item.product_id,
            quantity: item.quantity,
            notes: item.notes || '',
            updated_at: new Date().toISOString(),
          });
          itemIds.push(item.id);
        }
      }

      // Upsert dos pedidos (client-wins)
      const { error: orderError } = await client
        .from('orders')
        .upsert(ordersPayload, { onConflict: 'id' });

      if (orderError) {
        throw new Error(orderError.message);
      }
      ordersSynced = ordersPayload.length;

      // Upsert dos itens
      if (itemsPayload.length > 0) {
        const { error: itemsError } = await client
          .from('order_items')
          .upsert(itemsPayload, { onConflict: 'id' });

        if (itemsError) {
          throw new Error(itemsError.message);
        }
        itemsSynced = itemsPayload.length;
      }

      // Atualizar marcadores locais
      const orderIds = unsyncedOrders.map((o) => o.id);
      await OrdersRepository.markOrdersAsSynced(orderIds);
      await OrdersRepository.markItemsAsSynced(itemIds);

      this.pendingCount = 0;
      this.currentStatus = 'synced';
      this.notifyListeners();

      return { ordersSynced, itemsSynced, success: true };
    } catch (err: any) {
      this.currentStatus = 'error';
      this.notifyListeners();
      return {
        ordersSynced: 0,
        itemsSynced: 0,
        success: false,
        error: err?.message || 'Sync failed',
      };
    } finally {
      this.isSyncing = false;
    }
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentStatus, this.pendingCount);
      } catch {}
    }
  }
}
