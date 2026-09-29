export type UrgencyLevel = 'normal' | 'warning' | 'urgent';

export interface PattyCounterSummary {
  totalPendingPatties: number;    // Soma de todas as carnes nos status 'queued' e 'preparing'
  queuedPatties: number;          // Carnes aguardando início de preparo
  preparingPatties: number;       // Carnes que já estão na chapa
  ordersInQueueCount: number;     // Quantos pedidos no total estão na fila da cozinha
}

export interface KdsOrderWaitMetrics {
  orderId: string;
  dailyNumber: number;
  minutesElapsed: number;
  urgency: UrgencyLevel;
  totalPatties: number;
}
