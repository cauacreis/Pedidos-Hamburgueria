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
        const pattiesInItem = (item.patty_count ?? 1) * item.quantity;
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
      totalPatties += (item.patty_count ?? 1) * item.quantity;
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
   * Ordena a fila da cozinha priorizando pedidos mais antigos (FIFO)
   * e mantendo 'queued' e 'preparing' antes de 'ready'
   */
  static sortKdsOrders(orders: Order[]): Order[] {
    const statusWeight: Record<string, number> = {
      queued: 1,
      preparing: 2,
      ready: 3,
      delivered: 4,
    };

    return [...orders].sort((a, b) => {
      const weightA = statusWeight[a.status] || 99;
      const weightB = statusWeight[b.status] || 99;

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      // Se mesmo status, o mais antigo vem primeiro (FIFO)
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return timeA - timeB;
    });
  }
}
