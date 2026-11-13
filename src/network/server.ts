import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SocketMessage,
  NewOrderMessage,
  OrderStatusChangedMessage,
  InitialSyncMessage,
  UpdateOrderStatusMessage,
  OrderDeletedMessage,
  ClientCountMessage,
} from '../types/events';
import { Order, OrderStatus } from '../types/database';
import { OrdersRepository } from '../db/ordersRepository';
import { ServerStatus } from './types';
import { APP_CONFIG } from '../constants/config';
import { NetworkDiscovery } from './discovery';

type ServerMessageHandler = (message: SocketMessage) => void;
type ClientCountHandler = (count: number) => void;

export class PosWebSocketServer {
  private static instance: PosWebSocketServer | null = null;
  private server: any = null;
  private webSocketClient: any = null;
  private clients: Set<any> = new Set();
  private status: ServerStatus = 'idle';
  private port: number;
  private hubHost: string | null = null;
  private hubPort: number = APP_CONFIG.WEBSOCKET.DEFAULT_PORT;
  private hubReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private hubReconnectAttempts = 0;
  private hubClientsCount = 0;
  private intentionalHubDisconnect = false;

  private messageHandlers: Set<ServerMessageHandler> = new Set();
  private clientCountHandlers: Set<ClientCountHandler> = new Set();

  private constructor(port: number = APP_CONFIG.WEBSOCKET.DEFAULT_PORT) {
    this.port = port;
    this.hubPort = port;
  }

  public static getInstance(port: number = APP_CONFIG.WEBSOCKET.DEFAULT_PORT): PosWebSocketServer {
    if (!PosWebSocketServer.instance) {
      PosWebSocketServer.instance = new PosWebSocketServer(port);
    }
    return PosWebSocketServer.instance;
  }

  public getStatus(): ServerStatus {
    return this.status;
  }

  public getHubHost(): string | null {
    return this.hubHost;
  }

  public getConnectedClientsCount(): number {
    return Math.max(this.clients.size, this.hubClientsCount);
  }

  /**
   * Inicia o servidor WebSocket local na porta configurada ou conecta ao Hub local (Web/Expo Go)
   */
  public async start(): Promise<boolean> {
    if (this.status === 'running') {
      return true;
    }

    this.status = 'starting';
    this.intentionalHubDisconnect = false;

    // No navegador Web, conecta como cliente do hub WebSocket local
    if (Platform.OS === 'web') {
      const locationHost =
        typeof window !== 'undefined' && window.location && window.location.host
          ? window.location.host
          : `localhost:${this.port}`;
      const [parsedHost, parsedPort] = locationHost.split(':');
      const targetPort = parsedPort ? Number(parsedPort) || this.port : this.port;
      await this.connectToHub(parsedHost || 'localhost', targetPort, false);
      this.status = 'running';
      return true;
    }

    try {
      // No ambiente Node/Jest carrega dinamicamente sem acionar o bundler do Metro no mobile
      let WebSocketModule: any = null;
      if (typeof process !== 'undefined' && process.versions && process.versions.node) {
        try {
          const req = typeof (globalThis as any).__webpack_require__ === 'function' ? null : eval('require');
          if (req) {
            WebSocketModule = req('ws');
          }
        } catch {}
      }

      if (WebSocketModule && WebSocketModule.Server) {
        this.server = new WebSocketModule.Server({ port: this.port });

        this.server.on('connection', async (wsClient: any) => {
          this.clients.add(wsClient);
          this.notifyClientCount();

          // Enviar sincronização inicial com pedidos ativos da cozinha
          try {
            const activeOrders = await OrdersRepository.getActiveKitchenOrders();
            const initSyncMsg: InitialSyncMessage = {
              id: `sync_${Date.now()}`,
              timestamp: Date.now(),
              type: 'INITIAL_SYNC',
              payload: {
                orders: activeOrders,
                serverTime: Date.now(),
              },
            };
            wsClient.send(JSON.stringify(initSyncMsg));
          } catch (err) {
            // Falha ao obter pedidos iniciais
          }

          wsClient.on('message', async (data: any) => {
            this.handleClientMessage(wsClient, data);
          });

          wsClient.on('close', () => {
            this.clients.delete(wsClient);
            this.notifyClientCount();
          });

          wsClient.on('error', () => {
            this.clients.delete(wsClient);
            this.notifyClientCount();
          });
        });

        this.server.on('error', (err: any) => {
          this.status = 'error';
        });

        this.status = 'running';
        return true;
      }
    } catch (err) {
      // Fallback para ambiente móvel puro onde servidor em background usa Hub ou barramento local
    }

    // Mobile / Expo Go (sem suporte a servidor TCP nativo): conecta ao Hub na rede local/Hotspot
    try {
      const savedHost = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.LAST_SERVER_IP);
      const targetHost = savedHost && savedHost.trim().length > 0 ? savedHost.trim() : '192.168.43.1';
      await this.connectToHub(targetHost, this.port, false);
    } catch {}

    this.status = 'running';
    return true;
  }

  /**
   * Conecta o Caixa (iPhone no Expo Go ou Web) a um Hub WebSocket local na rede/Hotspot
   */
  public async connectToHub(
    hostOrPayload: string,
    port: number = this.port,
    persist: boolean = true
  ): Promise<boolean> {
    const parsedPairing = NetworkDiscovery.parsePairingPayload(hostOrPayload);
    let cleanHost = parsedPairing ? parsedPairing.host : hostOrPayload.trim();
    let targetPort = parsedPairing ? parsedPairing.port : port;

    cleanHost = cleanHost.replace(/^wss?:\/\//i, '').replace(/\/.*$/, '');
    if (cleanHost.includes(':')) {
      const [h, p] = cleanHost.split(':');
      cleanHost = h;
      const numericPort = Number(p);
      if (!Number.isNaN(numericPort) && numericPort > 0) {
        targetPort = numericPort;
      }
    }

    if (!cleanHost) {
      return false;
    }

    if (this.hubReconnectTimer) {
      clearTimeout(this.hubReconnectTimer);
      this.hubReconnectTimer = null;
    }

    if (this.webSocketClient) {
      this.intentionalHubDisconnect = true;
      try {
        this.webSocketClient.onclose = null;
        this.webSocketClient.close();
      } catch {}
      this.webSocketClient = null;
    }

    this.intentionalHubDisconnect = false;
    this.hubHost = cleanHost;
    this.hubPort = targetPort;

    if (persist) {
      try {
        await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.LAST_SERVER_IP, cleanHost);
      } catch {}
    }

    if (typeof WebSocket === 'undefined') {
      this.status = 'running';
      return false;
    }

    try {
      const ws = new WebSocket(`ws://${cleanHost}:${targetPort}`);
      this.webSocketClient = ws;

      ws.onopen = async () => {
        if (this.webSocketClient !== ws) return;
        this.hubReconnectAttempts = 0;
        this.status = 'running';

        try {
          const activeOrders = await OrdersRepository.getActiveKitchenOrders();
          if (activeOrders.length > 0 && ws.readyState === 1) {
            const initSyncMsg: InitialSyncMessage = {
              id: `sync_${Date.now()}`,
              timestamp: Date.now(),
              type: 'INITIAL_SYNC',
              payload: {
                orders: activeOrders,
                serverTime: Date.now(),
              },
            };
            ws.send(JSON.stringify(initSyncMsg));
          }
        } catch {}

        this.notifyClientCount();
      };

      ws.onmessage = (event: any) => {
        this.handleClientMessage(ws, event.data);
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        if (this.webSocketClient === ws) {
          this.webSocketClient = null;
          this.hubClientsCount = 0;
          this.notifyClientCount();
          if (!this.intentionalHubDisconnect && this.status !== 'stopped') {
            this.scheduleHubReconnect();
          }
        }
      };

      this.status = 'running';
      return true;
    } catch {
      this.scheduleHubReconnect();
      return false;
    }
  }

  /**
   * Força reconexão imediata ao Hub ao voltar do background no iPhone
   */
  public reconnectNow(): void {
    if (this.server) return;
    if (this.webSocketClient && this.webSocketClient.readyState === 1) return;
    if (this.hubHost && !this.intentionalHubDisconnect && this.status !== 'stopped') {
      this.hubReconnectAttempts = 0;
      void this.connectToHub(this.hubHost, this.hubPort, false);
    }
  }

  private scheduleHubReconnect(): void {
    if (
      this.hubReconnectTimer ||
      !this.hubHost ||
      this.intentionalHubDisconnect ||
      this.status === 'stopped'
    ) {
      return;
    }

    const delay = Math.min(
      APP_CONFIG.WEBSOCKET.INITIAL_RECONNECT_DELAY_MS *
        Math.pow(APP_CONFIG.WEBSOCKET.RECONNECT_BACKOFF_FACTOR, this.hubReconnectAttempts),
      APP_CONFIG.WEBSOCKET.MAX_RECONNECT_DELAY_MS
    );
    this.hubReconnectAttempts += 1;

    this.hubReconnectTimer = setTimeout(() => {
      this.hubReconnectTimer = null;
      if (this.hubHost && !this.intentionalHubDisconnect && this.status !== 'stopped') {
        void this.connectToHub(this.hubHost, this.hubPort, false);
      }
    }, delay);
  }

  /**
   * Encerra o servidor e desconecta clientes
   */
  public stop(): void {
    this.intentionalHubDisconnect = true;
    if (this.hubReconnectTimer) {
      clearTimeout(this.hubReconnectTimer);
      this.hubReconnectTimer = null;
    }
    if (this.server) {
      try {
        this.server.close();
      } catch {}
      this.server = null;
    }
    if (this.webSocketClient) {
      try {
        this.webSocketClient.onclose = null;
        this.webSocketClient.close();
      } catch {}
      this.webSocketClient = null;
    }
    this.hubClientsCount = 0;
    this.clients.clear();
    this.status = 'stopped';
    this.notifyClientCount();
  }

  /**
   * Dispara evento de novo pedido criado para todas as cozinhas conectadas
   */
  public broadcastNewOrder(order: Order): void {
    const msg: NewOrderMessage = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      type: 'NEW_ORDER',
      payload: order,
    };
    this.broadcast(msg);
  }

  /**
   * Dispara atualização de status para todas as cozinhas e ouvintes locais
   */
  public broadcastOrderStatusChanged(orderId: string, status: OrderStatus): void {
    const msg: OrderStatusChangedMessage = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      type: 'ORDER_STATUS_CHANGED',
      payload: {
        order_id: orderId,
        status,
        updated_at: new Date().toISOString(),
      },
    };
    this.broadcast(msg);
  }

  /**
   * Dispara evento de pedidos excluídos/resetados por tempo de espera para todas as cozinhas
   */
  public broadcastOrderDeleted(orderIds: string[]): void {
    if (!orderIds || orderIds.length === 0) return;
    const msg: OrderDeletedMessage = {
      id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      type: 'ORDER_DELETED',
      payload: {
        order_ids: orderIds,
        deleted_at: new Date().toISOString(),
      },
    };
    this.broadcast(msg);
  }

  /**
   * Envia mensagem para todos os clientes conectados
   */
  public broadcast(message: SocketMessage): void {
    const serialized = JSON.stringify(message);
    for (const client of this.clients) {
      try {
        if (client.readyState === 1 /* OPEN */) {
          client.send(serialized);
        }
      } catch {}
    }

    if (this.webSocketClient && this.webSocketClient.readyState === 1 /* OPEN */) {
      try {
        this.webSocketClient.send(serialized);
      } catch {}
    }

    // Notificar ouvintes locais no mesmo dispositivo
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch {}
    }
  }

  public onMessage(handler: ServerMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public onClientCountChange(handler: ClientCountHandler): () => void {
    this.clientCountHandlers.add(handler);
    handler(this.getConnectedClientsCount());
    return () => this.clientCountHandlers.delete(handler);
  }

  private async handleClientMessage(sender: any, rawData: any): Promise<void> {
    try {
      const parsed: SocketMessage = typeof rawData === 'string' ? JSON.parse(rawData) : JSON.parse(rawData.toString());

      if (parsed.type === 'PING') {
        sender.send(JSON.stringify({ id: `pong_${Date.now()}`, timestamp: Date.now(), type: 'PONG' }));
        return;
      }

      if (parsed.type === 'CLIENT_COUNT') {
        this.hubClientsCount = (parsed as ClientCountMessage).payload?.count ?? 0;
        this.notifyClientCount();
        return;
      }

      if (parsed.type === 'UPDATE_ORDER_STATUS') {
        const payload = (parsed as UpdateOrderStatusMessage).payload;
        // Atualizar no banco SQLite local
        await OrdersRepository.updateOrderStatus(payload.order_id, payload.status);

        // Reencaminhar status atualizado para todas as telas (já notifica ouvintes locais)
        this.broadcastOrderStatusChanged(payload.order_id, payload.status);
        return;
      }

      // Notificar ouvintes locais para mensagens gerais
      for (const handler of this.messageHandlers) {
        try {
          handler(parsed);
        } catch {}
      }
    } catch {}
  }

  private notifyClientCount(): void {
    const count = this.getConnectedClientsCount();
    for (const handler of this.clientCountHandlers) {
      try {
        handler(count);
      } catch {}
    }
  }
}
