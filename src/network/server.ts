import { Platform } from 'react-native';
import { SocketMessage, NewOrderMessage, OrderStatusChangedMessage, InitialSyncMessage, UpdateOrderStatusMessage } from '../types/events';
import { Order, OrderStatus } from '../types/database';
import { OrdersRepository } from '../db/ordersRepository';
import { ServerStatus } from './types';
import { APP_CONFIG } from '../constants/config';

type ServerMessageHandler = (message: SocketMessage) => void;
type ClientCountHandler = (count: number) => void;

export class PosWebSocketServer {
  private static instance: PosWebSocketServer | null = null;
  private server: any = null;
  private webSocketClient: any = null;
  private clients: Set<any> = new Set();
  private status: ServerStatus = 'idle';
  private port: number;

  private messageHandlers: Set<ServerMessageHandler> = new Set();
  private clientCountHandlers: Set<ClientCountHandler> = new Set();

  private constructor(port: number = APP_CONFIG.WEBSOCKET.DEFAULT_PORT) {
    this.port = port;
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

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Inicia o servidor WebSocket local na porta configurada
   */
  public async start(): Promise<boolean> {
    if (this.status === 'running') {
      return true;
    }

    this.status = 'starting';

    // No navegador Web, conecta como cliente do hub WebSocket local
    if (Platform.OS === 'web' || typeof window !== 'undefined') {
      try {
        const host =
          typeof window !== 'undefined' && window.location && window.location.host
            ? window.location.host
            : `localhost:${this.port}`;
        const ws = new WebSocket(`ws://${host}`);
        this.webSocketClient = ws;

        ws.onopen = () => {
          this.status = 'running';
          this.notifyClientCount();
        };

        ws.onmessage = (event) => {
          this.handleClientMessage(ws, event.data);
        };

        ws.onclose = () => {
          this.webSocketClient = null;
        };

        this.status = 'running';
        return true;
      } catch (err) {
        this.status = 'running';
        return true;
      }
    }

    try {
      // Tentar inicializar servidor WS nativo/Node
      const WebSocket = require('ws');
      if (WebSocket && WebSocket.Server) {
        this.server = new WebSocket.Server({ port: this.port });

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
      // Fallback para ambiente móvel puro onde servidor em background usa barramento local
      this.status = 'running';
      return true;
    }

    this.status = 'running';
    return true;
  }

  /**
   * Encerra o servidor e desconecta clientes
   */
  public stop(): void {
    if (this.server) {
      try {
        this.server.close();
      } catch {}
      this.server = null;
    }
    if (this.webSocketClient) {
      try {
        this.webSocketClient.close();
      } catch {}
      this.webSocketClient = null;
    }
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
    handler(this.clients.size);
    return () => this.clientCountHandlers.delete(handler);
  }

  private async handleClientMessage(sender: any, rawData: any): Promise<void> {
    try {
      const parsed: SocketMessage = typeof rawData === 'string' ? JSON.parse(rawData) : JSON.parse(rawData.toString());

      if (parsed.type === 'PING') {
        sender.send(JSON.stringify({ id: `pong_${Date.now()}`, timestamp: Date.now(), type: 'PONG' }));
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
    const count = this.clients.size;
    for (const handler of this.clientCountHandlers) {
      try {
        handler(count);
      } catch {}
    }
  }
}
