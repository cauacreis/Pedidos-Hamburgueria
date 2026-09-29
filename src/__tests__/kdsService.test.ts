import { KdsService } from '../services/kdsService';
import { Order } from '../types/database';

describe('KdsService - Grill Meat Counter & Queue Prioritization', () => {
  const sampleOrders: Order[] = [
    {
      id: 'ord-1',
      daily_number: 1,
      customer_name: 'Lucas',
      total: 64.0,
      status: 'queued',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago (urgent)
      synced: false,
      items: [
        {
          id: 'i1',
          order_id: 'ord-1',
          product_id: 'p1',
          quantity: 2,
          patty_count: 2, // 2x Double Smash = 4 carnes
          synced: false,
        },
        {
          id: 'i2',
          order_id: 'ord-1',
          product_id: 'p2',
          quantity: 1,
          patty_count: 0, // Batata = 0 carnes
          synced: false,
        },
      ],
    },
    {
      id: 'ord-2',
      daily_number: 2,
      customer_name: 'Mariana',
      total: 44.0,
      status: 'preparing',
      created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 min ago (warning)
      synced: false,
      items: [
        {
          id: 'i3',
          order_id: 'ord-2',
          product_id: 'p3',
          quantity: 1,
          patty_count: 3, // Monster Triple = 3 carnes
          synced: false,
        },
      ],
    },
    {
      id: 'ord-3',
      daily_number: 3,
      customer_name: 'Pedro',
      total: 28.0,
      status: 'ready', // Já está pronto, NÃO deve contar na chapa
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      synced: true,
      items: [
        {
          id: 'i4',
          order_id: 'ord-3',
          product_id: 'p4',
          quantity: 2,
          patty_count: 1, // 2 carnes, mas pedido já pronto
          synced: true,
        },
      ],
    },
    {
      id: 'ord-4',
      daily_number: 4,
      customer_name: 'Ana',
      total: 28.0,
      status: 'delivered', // Entregue, NÃO conta
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      synced: true,
      items: [
        {
          id: 'i5',
          order_id: 'ord-4',
          product_id: 'p5',
          quantity: 1,
          patty_count: 1,
          synced: true,
        },
      ],
    },
  ];

  it('correctly consolidates grill patties count only for queued and preparing orders', () => {
    const summary = KdsService.calculatePattyCounter(sampleOrders);

    // ord-1 (queued): 2 x 2 = 4 carnes
    // ord-2 (preparing): 1 x 3 = 3 carnes
    // Total = 7 carnes a grelhar
    expect(summary.queuedPatties).toBe(4);
    expect(summary.preparingPatties).toBe(3);
    expect(summary.totalPendingPatties).toBe(7);
    expect(summary.ordersInQueueCount).toBe(2);
  });

  it('calculates urgency and elapsed minutes accurately', () => {
    const now = Date.now();
    const urgentOrder = sampleOrders[0]; // 15 min ago
    const warningOrder = sampleOrders[1]; // 8 min ago

    const urgentMetrics = KdsService.calculateWaitMetrics(urgentOrder, now);
    expect(urgentMetrics.urgency).toBe('urgent');
    expect(urgentMetrics.minutesElapsed).toBeGreaterThanOrEqual(14);
    expect(urgentMetrics.totalPatties).toBe(4);

    const warningMetrics = KdsService.calculateWaitMetrics(warningOrder, now);
    expect(warningMetrics.urgency).toBe('warning');
    expect(warningMetrics.minutesElapsed).toBeGreaterThanOrEqual(7);
    expect(warningMetrics.totalPatties).toBe(3);
  });

  it('sorts orders in FIFO order prioritizing older orders in the same status', () => {
    const sorted = KdsService.sortKdsOrders(sampleOrders);
    
    // ord-1 (15 min ago) should come before ord-2 (8 min ago)
    // ord-3 (ready) should be after queued/preparing
    expect(sorted[0].id).toBe('ord-1');
    expect(sorted[1].id).toBe('ord-2');
    expect(sorted[2].id).toBe('ord-3');
    expect(sorted[3].id).toBe('ord-4');
  });

  it('prioritizes older preparing order over a brand-new queued order by wait time', () => {
    const oldPreparing: Order = {
      id: 'ord-old-prep',
      daily_number: 10,
      customer_name: 'Antigo na Chapa',
      total: 30,
      status: 'preparing',
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 min ago
      synced: true,
      items: [{ id: 'it-1', order_id: 'ord-old-prep', product_id: 'p1', quantity: 1, patty_count: 1, synced: true }],
    };

    const newQueued: Order = {
      id: 'ord-new-queue',
      daily_number: 11,
      customer_name: 'Novo na Fila',
      total: 30,
      status: 'queued',
      created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 min ago
      synced: true,
      items: [{ id: 'it-2', order_id: 'ord-new-queue', product_id: 'p1', quantity: 1, patty_count: 1, synced: true }],
    };

    const sorted = KdsService.sortKdsOrders([newQueued, oldPreparing]);
    // O pedido mais antigo (25 min) DEVE vir antes do novo (1 min)
    expect(sorted[0].id).toBe('ord-old-prep');
    expect(sorted[1].id).toBe('ord-new-queue');
  });

  it('does not increment patty count for items with undefined or zero patty_count', () => {
    const drinkOrder: Order = {
      id: 'ord-drink',
      daily_number: 99,
      customer_name: 'Apenas Bebidas',
      total: 14,
      status: 'queued',
      created_at: new Date().toISOString(),
      synced: false,
      items: [
        { id: 'd1', order_id: 'ord-drink', product_id: 'prod-coca-cola', quantity: 2, patty_count: 0, synced: false },
        { id: 'd2', order_id: 'ord-drink', product_id: 'prod-agua', quantity: 1, patty_count: undefined, synced: false },
      ],
    };

    const summary = KdsService.calculatePattyCounter([drinkOrder]);
    expect(summary.totalPendingPatties).toBe(0);
    expect(summary.queuedPatties).toBe(0);

    const metrics = KdsService.calculateWaitMetrics(drinkOrder);
    expect(metrics.totalPatties).toBe(0);
  });
});
