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

  /**
   * Filtra pedidos esquecidos que ultrapassaram o tempo limite de espera (X horas)
   */
  static filterStaleOrders(orders: Order[], staleHours: number = APP_CONFIG.ORDERS.DEFAULT_STALE_HOURS): Order[] {
    if (!staleHours || staleHours <= 0) return orders;
    const cutoffTimeMs = Date.now() - staleHours * 60 * 60 * 1000;
    return orders.filter((order) => {
      const orderTimeMs = new Date(order.created_at).getTime();
      return orderTimeMs >= cutoffTimeMs;
    });
  }

  /**
   * Verifica se o pedido já foi confirmado/entregue pelo balcão
   */
  static isOrderConfirmed(order: Order): boolean {
    return order.status === 'ready' || order.status === 'delivered';
  }

  /**
   * Ordena os pedidos para a rolagem automática da Cozinha (KDS):
   * - Pedidos já confirmados/entregues ('ready' e 'delivered') ficam no topo (grupo 1),
   *   em ordem cronológica (#01, #02...) para rolarem para cima quando houver espaço.
   * - Pedidos pendentes de preparo ('queued' e 'preparing') vêm logo abaixo (grupo 2),
   *   em ordem cronológica FIFO para que o próximo da fila fique no topo visível.
   */
  static sortOrdersForAutoScroll(orders: Order[]): Order[] {
    return [...orders].sort((a, b) => {
      const groupA = this.isOrderConfirmed(a) ? 1 : 2;
      const groupB = this.isOrderConfirmed(b) ? 1 : 2;

      if (groupA !== groupB) {
        return groupA - groupB;
      }

      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) {
        return timeA - timeB;
      }

      return a.daily_number - b.daily_number;
    });
  }

  /**
   * Calcula a posição Y ideal de rolagem automática na tela da Cozinha:
   * - Se não houver pedidos suficientes para encher a tela (contentHeight <= viewportHeight),
   *   retorna 0 (não rola, os pedidos confirmados aparecem apenas marcados como entregues).
   * - Se houver pedidos suficientes para rolar, rola até o primeiro pedido pendente
   *   (limitado a maxScrollY para não criar espaço em branco no fim da lista).
   */
  static calculateAutoScrollOffset(
    sortedOrders: Order[],
    cardPositions: Record<string, number>,
    contentHeight: number,
    viewportHeight: number
  ): number {
    const maxScrollY = Math.max(0, contentHeight - viewportHeight);
    if (maxScrollY <= 0) {
      return 0;
    }

    const firstPending = sortedOrders.find((o) => !this.isOrderConfirmed(o));
    if (!firstPending) {
      // Todos os pedidos foram entregues: rola até o final disponível da lista
      return maxScrollY;
    }

    const targetY = cardPositions[firstPending.id];
    if (typeof targetY !== 'number' || isNaN(targetY)) {
      return 0;
    }

    return Math.min(Math.max(0, targetY), maxScrollY);
  }
}
