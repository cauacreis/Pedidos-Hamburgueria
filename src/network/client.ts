import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocketMessage, UpdateOrderStatusMessage, PingMessage, Order, OrderStatus } from '../types/events';
import { ConnectionStatus, WebSocketClientOptions } from './types';
import { APP_CONFIG } from '../constants/config';
import { NetworkDiscovery } from './discovery';

type MessageHandler = (message: SocketMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export class KdsWebSocketClient {
  private ws: WebSocket | null = null;
  private currentUrl: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimeoutId: any = null;
  private heartbeatIntervalId: any = null;
  private reconnectAttempts = 0;
  private isExplicitlyClosed = false;

  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();

  private options: Required<WebSocketClientOptions>;

  constructor(options?: WebSocketClientOptions) {
    this.options = {
      autoReconnect: options?.autoReconnect ?? true,
      heartbeatIntervalMs: options?.heartbeatIntervalMs ?? APP_CONFIG.WEBSOCKET.HEARTBEAT_INTERVAL_MS,
      initialReconnectDelayMs: options?.initialReconnectDelayMs ?? APP_CONFIG.WEBSOCKET.INITIAL_RECONNECT_DELAY_MS,
      maxReconnectDelayMs: options?.maxReconnectDelayMs ?? APP_CONFIG.WEBSOCKET.MAX_RECONNECT_DELAY_MS,
      backoffFactor: options?.backoffFactor ?? APP_CONFIG.WEBSOCKET.RECONNECT_BACKOFF_FACTOR,
    };
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getUrl(): string | null {
    return this.currentUrl;
  }

  /**
   * Conecta ao servidor Caixa via IP/host e porta
   */
  public async connect(host: string, port: number = APP_CONFIG.WEBSOCKET.DEFAULT_PORT): Promise<void> {
    const url = NetworkDiscovery.buildWebSocketUrl(host, port);
    this.isExplicitlyClosed = false;
    this.currentUrl = url;

    // Salvar último IP conectado com sucesso
    try {
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.LAST_SERVER_IP, host);
    } catch {
      // Falha silenciosa em AsyncStorage
    }

    this.initiateSocket(url);
  }

  /**
   * Tenta conectar com o último IP salvo no AsyncStorage
   */
  public async connectLastSaved(): Promise<boolean> {
    try {
      const savedHost = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.LAST_SERVER_IP);
      if (savedHost) {
        await this.connect(savedHost);
        return true;
      }
    } catch {
      // Ignora erro
    }
    return false;
  }

  /**
   * Fecha conexão ativamente
   */
  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  /**
   * Envia atualização de status de um pedido para o Caixa
   */
  public updateOrderStatus(orderId: string, status: OrderStatus): boolean {
    const msg: UpdateOrderStatusMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      type: 'UPDATE_ORDER_STATUS',
      payload: {
        order_id: orderId,
        status,
        updated_at: new Date().toISOString(),
      },
    };
    return this.send(msg);
  }

  /**
   * Envia uma mensagem genérica de protocolo
   */
  public send(message: SocketMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (err) {
      return false;
    }
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  public onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  // --- Lógica Interna de Conexão e Auto-Reconnect ---

  private initiateSocket(url: string): void {
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      const socket = new WebSocket(url);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.reconnectAttempts = 0;
        this.setStatus('connected');
        this.startHeartbeat();
      };

      socket.onmessage = (event) => {
        if (this.ws !== socket) return;
        this.handleIncomingRawMessage(event.data);
      };

      socket.onerror = (err) => {
        if (this.ws !== socket) return;
        // Erro de socket - o onclose tratará a reconexão
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.ws = null;
        this.clearTimers();

        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        } else {
          this.setStatus('disconnected');
        }
      };
    } catch (error) {
      this.scheduleReconnect();
    }
  }

  private handleIncomingRawMessage(data: any): void {
    try {
      const parsed: SocketMessage = typeof data === 'string' ? JSON.parse(data) : data;
      if (parsed && parsed.type) {
        // Responder automaticamente a PING
        if (parsed.type === 'PING') {
          this.send({
            id: `pong_${Date.now()}`,
            timestamp: Date.now(),
            type: 'PONG',
          });
          return;
        }

        // Notificar ouvintes
        for (const handler of this.messageHandlers) {
          try {
            handler(parsed);
          } catch {}
        }
      }
    } catch {}
  }

  private scheduleReconnect(): void {
    if (!this.options.autoReconnect || this.isExplicitlyClosed || !this.currentUrl) {
      this.setStatus('disconnected');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    // Cálculo do Exponential Backoff com jitter
    const exponentialDelay =
      this.options.initialReconnectDelayMs *
      Math.pow(this.options.backoffFactor, Math.min(this.reconnectAttempts, 8));
    const cappedDelay = Math.min(exponentialDelay, this.options.maxReconnectDelayMs);
    const jitter = cappedDelay * 0.1 * (Math.random() - 0.5);
    const finalDelay = Math.max(500, Math.floor(cappedDelay + jitter));

    this.reconnectTimeoutId = setTimeout(() => {
      if (!this.isExplicitlyClosed && this.currentUrl) {
        this.initiateSocket(this.currentUrl);
      }
    }, finalDelay);
  }

  private startHeartbeat(): void {
    this.heartbeatIntervalId = setInterval(() => {
      if (this.status === 'connected') {
        const ping: PingMessage = {
          id: `ping_${Date.now()}`,
          timestamp: Date.now(),
          type: 'PING',
        };
        this.send(ping);
      }
    }, this.options.heartbeatIntervalMs);
  }

  private clearTimers(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    for (const handler of this.statusHandlers) {
      try {
        handler(newStatus);
      } catch {}
    }
  }
}
