import { Order, OrderStatus } from './database';
export { Order, OrderStatus };

export type WebSocketMessageType =
  | 'INITIAL_SYNC'          // Caixa envia todos os pedidos ativos para Cozinha ao conectar
  | 'NEW_ORDER'             // Caixa emite novo pedido para a Cozinha
  | 'UPDATE_ORDER_STATUS'   // Cozinha ou Caixa atualiza status de um pedido
  | 'ORDER_STATUS_CHANGED'  // Broadcast de status atualizado para todos os clientes
  | 'ORDER_DELIVERED'       // Caixa finaliza entrega do pedido
  | 'PING'                  // Heartbeat
  | 'PONG'                  // Resposta do Heartbeat
  | 'ACK';                  // Confirmação de recebimento

export interface BaseSocketMessage {
  id: string;
  timestamp: number;
}

export interface InitialSyncMessage extends BaseSocketMessage {
  type: 'INITIAL_SYNC';
  payload: {
    orders: Order[];
    serverTime: number;
  };
}

export interface NewOrderMessage extends BaseSocketMessage {
  type: 'NEW_ORDER';
  payload: Order;
}

export interface UpdateOrderStatusMessage extends BaseSocketMessage {
  type: 'UPDATE_ORDER_STATUS';
  payload: {
    order_id: string;
    status: OrderStatus;
    updated_at: string;
  };
}

export interface OrderStatusChangedMessage extends BaseSocketMessage {
  type: 'ORDER_STATUS_CHANGED';
  payload: {
    order_id: string;
    status: OrderStatus;
    updated_at: string;
  };
}

export interface OrderDeliveredMessage extends BaseSocketMessage {
  type: 'ORDER_DELIVERED';
  payload: {
    order_id: string;
    delivered_at: string;
  };
}

export interface PingMessage extends BaseSocketMessage {
  type: 'PING';
}

export interface PongMessage extends BaseSocketMessage {
  type: 'PONG';
}

export interface AckMessage extends BaseSocketMessage {
  type: 'ACK';
  replyToId: string;
  success: boolean;
}

export type SocketMessage =
  | InitialSyncMessage
  | NewOrderMessage
  | UpdateOrderStatusMessage
  | OrderStatusChangedMessage
  | OrderDeliveredMessage
  | PingMessage
  | PongMessage
  | AckMessage;

export interface KdsPairingPayload {
  host: string;
  port: number;
  role: 'kds' | 'pos';
  serverName?: string;
  timestamp?: number;
}
