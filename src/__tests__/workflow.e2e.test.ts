import { OrdersRepository } from '../db/ordersRepository';
import { KdsService } from '../services/kdsService';
import { DashboardService } from '../services/dashboardService';
import { SupabaseSyncService } from '../services/syncService';
import { InMemoryDatabaseDriver, setCustomDatabaseDriver, initializeDatabase } from '../db/database';
import { INITIAL_PRODUCTS } from '../db/productsRepository';
import { Order } from '../types/database';

describe('Food Truck End-to-End Workflow Integration Test', () => {
  let driver: InMemoryDatabaseDriver;

  beforeEach(async () => {
    driver = new InMemoryDatabaseDriver();
    driver.seed(INITIAL_PRODUCTS);
    setCustomDatabaseDriver(driver);
    await initializeDatabase(driver);
  });

  it('runs complete lifecycle: ordering -> grill meat counting -> status transitions -> dashboard insights -> outbox sync', async () => {
    // 1. Início de turno: Caixa cria Pedido #01 (Carlos)
    // 1x Double Cheddar (2 carnes, R$ 36) + 1x Monster Triple (3 carnes, R$ 44)
    const order1 = await OrdersRepository.createOrder({
      customer_name: 'Carlos',
      items: [
        { product_id: 'prod-double-cheddar', quantity: 1, notes: 'Ao ponto' },
        { product_id: 'prod-monster-triple', quantity: 1, notes: 'Bem passado' },
      ],
    });

    expect(order1.daily_number).toBe(1);
    expect(order1.total).toBe(80.0);
    expect(order1.status).toBe('queued');
    expect(order1.synced).toBe(false);

    // 2. Cozinha (KDS) recebe o pedido na fila
    let kitchenOrders: Order[] = [order1];
    let pattyMetrics = KdsService.calculatePattyCounter(kitchenOrders);

    // Chapa deve indicar 5 carnes a grelhar (2 + 3)
    expect(pattyMetrics.totalPendingPatties).toBe(5);
    expect(pattyMetrics.queuedPatties).toBe(5);
    expect(pattyMetrics.preparingPatties).toBe(0);

    // 3. Cozinha inicia o preparo (status -> 'preparing')
    await OrdersRepository.updateOrderStatus(order1.id, 'preparing');
    kitchenOrders = kitchenOrders.map((o) => (o.id === order1.id ? { ...o, status: 'preparing' } : o));

    pattyMetrics = KdsService.calculatePattyCounter(kitchenOrders);
    expect(pattyMetrics.totalPendingPatties).toBe(5);
    expect(pattyMetrics.queuedPatties).toBe(0);
    expect(pattyMetrics.preparingPatties).toBe(5);

    // 4. Cozinha finaliza e marca como pronto (status -> 'ready')
    await OrdersRepository.updateOrderStatus(order1.id, 'ready');
    kitchenOrders = kitchenOrders.map((o) => (o.id === order1.id ? { ...o, status: 'ready' } : o));

    pattyMetrics = KdsService.calculatePattyCounter(kitchenOrders);
    // Como o hambúrguer já saiu da chapa/grelha, o contador de carnes ZERA
    expect(pattyMetrics.totalPendingPatties).toBe(0);

    // 5. Novo cliente no Caixa: Pedido #02 (Ana)
    // 2x Classic Smash (2 carnes, 2x 28 = 56)
    const order2 = await OrdersRepository.createOrder({
      customer_name: 'Ana',
      items: [{ product_id: 'prod-classic-smash', quantity: 2, notes: 'Sem picles' }],
    });

    expect(order2.daily_number).toBe(2);
    expect(order2.total).toBe(56.0);

    // Fila da cozinha com ambos
    kitchenOrders.push(order2);
    pattyMetrics = KdsService.calculatePattyCounter(kitchenOrders);
    // Apenas o pedido #02 está pendente de chapa (2 carnes)
    expect(pattyMetrics.totalPendingPatties).toBe(2);
    expect(pattyMetrics.queuedPatties).toBe(2);

    // 6. Verificação do Dashboard de Faturamento 100% Offline
    const dailySummary = await DashboardService.getDailySummary();
    expect(dailySummary.total_orders).toBe(2);
    expect(dailySummary.total_revenue).toBe(136.0); // 80 + 56
    expect(dailySummary.average_ticket).toBe(68.0); // 136 / 2
    expect(dailySummary.total_burgers_sold).toBe(4); // 1 + 1 + 2
    expect(dailySummary.total_patties_sold).toBe(7); // 2 + 3 + 2

    // 7. Caixa entrega o pedido #01 ao cliente (status -> 'delivered')
    await OrdersRepository.updateOrderStatus(order1.id, 'delivered');
    const deliveredOrder = await OrdersRepository.getOrderById(order1.id);
    expect(deliveredOrder?.status).toBe('delivered');

    // 8. Sincronização em Nuvem (Supabase Outbox Pattern)
    const unsyncedBefore = await OrdersRepository.getUnsyncedOrders();
    expect(unsyncedBefore.length).toBe(2);

    const mockUpserted: any[] = [];
    const mockSupabase: any = {
      from: () => ({
        upsert: async (records: any[]) => {
          mockUpserted.push(...records);
          return { error: null };
        },
      }),
    };

    const syncService = SupabaseSyncService.getInstance();
    const syncResult = await syncService.syncOutbox(mockSupabase);

    expect(syncResult.success).toBe(true);
    expect(syncResult.ordersSynced).toBe(2);

    const unsyncedAfter = await OrdersRepository.getUnsyncedOrders();
    expect(unsyncedAfter.length).toBe(0);
  });
});
