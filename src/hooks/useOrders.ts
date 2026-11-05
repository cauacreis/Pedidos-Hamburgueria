import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, OrderStatus, CreateOrderInput } from '../types/database';
import { OrdersRepository } from '../db/ordersRepository';
import { PosWebSocketServer } from '../network/server';
import { KdsWebSocketClient } from '../network/client';
import {
  SocketMessage,
  InitialSyncMessage,
  NewOrderMessage,
  OrderStatusChangedMessage,
  OrderDeletedMessage,
} from '../types/events';
import { KdsService } from '../services/kdsService';
import { APP_CONFIG } from '../constants/config';

interface UseOrdersProps {
  role: 'pos' | 'kds' | 'dashboard';
  client?: KdsWebSocketClient | null;
  server?: PosWebSocketServer | null;
}

export function useOrders({ role, client, server }: UseOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [readyNotification, setReadyNotification] = useState<Order | null>(null);
  const [staleHours, setStaleHours] = useState<number>(APP_CONFIG.ORDERS.DEFAULT_STALE_HOURS);

  // Carregar tempo de expiração salvo pelo usuário (padrão: 2h)
  useEffect(() => {
    AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.STALE_HOURS).then((saved) => {
      if (saved) {
        const parsed = Number(saved);
        if (!isNaN(parsed) && parsed > 0) {
          setStaleHours(parsed);
        }
      }
    });
  }, []);

  // Limpeza automática de pedidos que ultrapassaram o tempo limite de espera (X horas)
  const cleanupStaleOrders = useCallback(
    async (hoursLimit?: number): Promise<string[]> => {
      const hours = hoursLimit ?? staleHours;
      try {
        if (role === 'pos' || role === 'dashboard') {
          const deletedIds = await OrdersRepository.deleteStaleOrders(hours);
          if (deletedIds.length > 0) {
            setOrders((prev) => prev.filter((o) => !deletedIds.includes(o.id)));
            if (server) {
              server.broadcastOrderDeleted(deletedIds);
            }
          }
          return deletedIds;
        } else if (role === 'kds') {
          // Na Cozinha, purga pedidos expirados do estado visual em tempo real
          const cutoff = Date.now() - hours * 60 * 60 * 1000;
          setOrders((prev) => prev.filter((o) => new Date(o.created_at).getTime() >= cutoff));
        }
      } catch {
        // Falha silenciosa
      }
      return [];
    },
    [role, staleHours, server]
  );

  // Atualizar configuração de horas limite
  const updateStaleHours = useCallback(
    async (hours: number) => {
      setStaleHours(hours);
      try {
        await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.STALE_HOURS, String(hours));
      } catch {}
      await cleanupStaleOrders(hours);
    },
    [cleanupStaleOrders]
  );

  // Carrega pedidos iniciais do SQLite local
  const loadOrders = useCallback(async () => {
    try {
      if (role === 'kds') {
        const active = await OrdersRepository.getActiveKitchenOrders(staleHours);
        const filtered = KdsService.filterStaleOrders(active, staleHours);
        setOrders(KdsService.sortKdsOrders(filtered));
      } else {
        await OrdersRepository.deleteStaleOrders(staleHours);
        const all = await OrdersRepository.getAllOrders();
        setOrders(all);
      }
    } catch {
      // Ignora erro
    } finally {
      setLoading(false);
    }
  }, [role, staleHours]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Limpeza periódica em background a cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      cleanupStaleOrders();
    }, APP_CONFIG.ORDERS.CLEANUP_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [cleanupStaleOrders]);

  // Recarrega pedidos e purga expirados ao reabrir/desbloquear o aparelho
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        cleanupStaleOrders();
        loadOrders();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [cleanupStaleOrders, loadOrders]);

  // Listener para eventos de WebSocket
  useEffect(() => {
    if (role === 'kds' && client) {
      const unsub = client.onMessage((msg: SocketMessage) => {
        if (msg.type === 'INITIAL_SYNC') {
          const syncPayload = (msg as InitialSyncMessage).payload;
          const filtered = KdsService.filterStaleOrders(syncPayload.orders, staleHours);
          setOrders(KdsService.sortKdsOrders(filtered));
        } else if (msg.type === 'NEW_ORDER') {
          const newOrder = (msg as NewOrderMessage).payload;
          setOrders((prev) => {
            const exists = prev.some((o) => o.id === newOrder.id);
            if (exists) return prev;
            return KdsService.sortKdsOrders([...prev, newOrder]);
          });
        } else if (msg.type === 'ORDER_STATUS_CHANGED') {
          const { order_id, status } = (msg as OrderStatusChangedMessage).payload;
          setOrders((prev) => {
            const updated = prev
              .map((o) => (o.id === order_id ? { ...o, status } : o))
              .filter((o) => o.status !== 'delivered');
            return KdsService.sortKdsOrders(updated);
          });
        } else if (msg.type === 'ORDER_DELETED') {
          const { order_id, order_ids } = (msg as OrderDeletedMessage).payload;
          const ids = order_ids || (order_id ? [order_id] : []);
          setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
        }
      });

      return () => {
        unsub();
      };
    }

    if (role === 'pos' && server) {
      const unsub = server.onMessage((msg: SocketMessage) => {
        if (msg.type === 'ORDER_STATUS_CHANGED') {
          const { order_id, status } = (msg as OrderStatusChangedMessage).payload;
          setOrders((prev) => {
            const found = prev.find((o) => o.id === order_id);
            if (found && status === 'ready' && found.status !== 'ready') {
              setReadyNotification({ ...found, status: 'ready' });
            }
            return prev.map((o) => (o.id === order_id ? { ...o, status } : o));
          });
        } else if (msg.type === 'ORDER_DELETED') {
          const { order_id, order_ids } = (msg as OrderDeletedMessage).payload;
          const ids = order_ids || (order_id ? [order_id] : []);
          setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
        }
      });

      return () => {
        unsub();
      };
    }
  }, [role, client, server, staleHours]);

  /**
   * Caixa: Cria um novo pedido no SQLite e envia via WebSocket para a cozinha
   */
  const createOrder = useCallback(
    async (input: CreateOrderInput): Promise<Order> => {
      const newOrder = await OrdersRepository.createOrder(input);

      // Atualizar lista local
      setOrders((prev) => [newOrder, ...prev]);

      // Enviar instantaneamente via WebSocket para a cozinha
      if (server) {
        server.broadcastNewOrder(newOrder);
      }

      return newOrder;
    },
    [server]
  );

  /**
   * Atualiza o status do pedido (queued -> preparing -> ready -> delivered)
   */
  const updateOrderStatus = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
        return role === 'kds'
          ? KdsService.sortKdsOrders(next.filter((o) => o.status !== 'delivered'))
          : next;
      });

      if (role === 'kds' && client) {
        client.updateOrderStatus(orderId, newStatus);
      } else {
        await OrdersRepository.updateOrderStatus(orderId, newStatus);
        if (server) {
          server.broadcastOrderStatusChanged(orderId, newStatus);
        }
      }
    },
    [role, client, server]
  );

  /**
   * Ação rápida de entregar pedido
   */
  const deliverOrder = useCallback(
    async (orderId: string) => {
      await updateOrderStatus(orderId, 'delivered');
      if (readyNotification?.id === orderId) {
        setReadyNotification(null);
      }
    },
    [updateOrderStatus, readyNotification]
  );

  /**
   * Deleta um pedido específico da fila (ex: cancelado ou excluído manualmente)
   */
  const deleteOrder = useCallback(
    async (orderId: string) => {
      await OrdersRepository.deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (readyNotification?.id === orderId) {
        setReadyNotification(null);
      }
      if (server) {
        server.broadcastOrderDeleted([orderId]);
      }
    },
    [server, readyNotification]
  );

  const dismissNotification = useCallback(() => {
    setReadyNotification(null);
  }, []);

  return {
    orders,
    loading,
    readyNotification,
    staleHours,
    updateStaleHours,
    cleanStaleOrdersNow: cleanupStaleOrders,
    createOrder,
    updateOrderStatus,
    deliverOrder,
    deleteOrder,
    dismissNotification,
    refreshOrders: loadOrders,
  };
}
