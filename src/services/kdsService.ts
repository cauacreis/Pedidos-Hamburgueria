import { Order } from '../types/database';
import { PattyCounterSummary, KdsOrderWaitMetrics, UrgencyLevel } from '../types/kds';
import { APP_CONFIG } from '../constants/config';

export class KdsService {
  /**
   * Calcula o consolidado de carnes / chapa em tempo real
   * Soma de (quantity * patty_count) de todos os pedidos 'queued' e 'preparing'
   */
  static calculatePattyCounter(orders: Order[]): PattyCounterSummary {
    let queuedPatties = 0;
    let preparingPatties = 0;
    let ordersInQueueCount = 0;

    for (const order of orders) {
      if (order.status !== 'queued' && order.status !== 'preparing') {
        continue;
      }

      ordersInQueueCount++;
      const items = order.items || [];

      for (const item of items) {
        const pattiesInItem = (item.patty_count ?? 0) * item.quantity;
        if (order.status === 'queued') {
          queuedPatties += pattiesInItem;
        } else if (order.status === 'preparing') {
          preparingPatties += pattiesInItem;
        }
      }
    }

    return {
      totalPendingPatties: queuedPatties + preparingPatties,
      queuedPatties,
      preparingPatties,
      ordersInQueueCount,
    };
  }

  /**
   * Calcula o tempo de espera do pedido e seu nível de urgência
   */
  static calculateWaitMetrics(order: Order, currentTimeMs: number = Date.now()): KdsOrderWaitMetrics {
    const createdAtMs = new Date(order.created_at).getTime();
    const elapsedDiffMs = Math.max(0, currentTimeMs - createdAtMs);
    const minutesElapsed = Math.floor(elapsedDiffMs / (1000 * 60));

    let urgency: UrgencyLevel = 'normal';
    if (minutesElapsed >= APP_CONFIG.KDS.URGENT_TIME_MINUTES) {
      urgency = 'urgent';
    } else if (minutesElapsed >= APP_CONFIG.KDS.WARNING_TIME_MINUTES) {
      urgency = 'warning';
    }

    let totalPatties = 0;
    for (const item of order.items || []) {
      totalPatties += (item.patty_count ?? 0) * item.quantity;
    }

    return {
      orderId: order.id,
      dailyNumber: order.daily_number,
      minutesElapsed,
      urgency,
      totalPatties,
    };
  }

  /**
   * Ordena a fila da cozinha priorizando pedidos mais antigos / maior tempo de espera (FIFO)
   * mantendo pedidos ativos (queued e preparing) antes de 'ready'
   */
  static sortKdsOrders(orders: Order[]): Order[] {
    const statusGroup: Record<string, number> = {
      queued: 1,
      preparing: 1, // Ambos são pedidos ativos da fila de chapa
      ready: 2,     // Pedido pronto aguardando retirada
      delivered: 3,
    };

    return [...orders].sort((a, b) => {
      const groupA = statusGroup[a.status] || 99;
      const groupB = statusGroup[b.status] || 99;

      if (groupA !== groupB) {
        return groupA - groupB;
      }

      // No mesmo grupo, o mais antigo (maior tempo de espera) vem primeiro (FIFO)
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) {
        return timeA - timeB;
      }

      if (a.status === 'preparing' && b.status === 'queued') return -1;
      if (a.status === 'queued' && b.status === 'preparing') return 1;

      return 0;
    });
  }
}
