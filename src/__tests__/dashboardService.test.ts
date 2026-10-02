import { DashboardService } from '../services/dashboardService';
import { OrdersRepository } from '../db/ordersRepository';
import { InMemoryDatabaseDriver, setCustomDatabaseDriver, initializeDatabase } from '../db/database';
import { INITIAL_PRODUCTS } from '../db/productsRepository';

describe('DashboardService - Offline Financial Metrics & Sales Insights', () => {
  let inMemoryDriver: InMemoryDatabaseDriver;

  beforeEach(async () => {
    inMemoryDriver = new InMemoryDatabaseDriver();
    inMemoryDriver.seed(INITIAL_PRODUCTS);
    setCustomDatabaseDriver(inMemoryDriver);
    await initializeDatabase(inMemoryDriver);

    // Criar pedidos simulados no banco
    await OrdersRepository.createOrder({
      customer_name: 'Cliente 1',
      items: [
        { product_id: 'prod-double-cheddar', quantity: 2 }, // 2x burger, 4 carnes (36*2=72)
      ],
    });

    await OrdersRepository.createOrder({
      customer_name: 'Cliente 2',
      items: [
        { product_id: 'prod-classic-smash', quantity: 1 }, // 1x burger, 1 carne (28)
        { product_id: 'prod-batata-rustica', quantity: 1 }, // 1x batata (18)
      ],
    });
  });

  it('aggregates daily revenue, total burgers, and average ticket accurately', async () => {
    const summary = await DashboardService.getDailySummary();

    expect(summary.total_orders).toBe(2);
    expect(summary.total_revenue).toBe(118.0); // 72 + 46 = 118
    expect(summary.average_ticket).toBe(59.0); // 118 / 2
    expect(summary.total_burgers_sold).toBe(3);
    expect(summary.total_patties_sold).toBe(5); // 4 + 1
  });

  it('ranks top selling products', async () => {
    const summary = await DashboardService.getDailySummary();
    expect(summary.top_products.length).toBeGreaterThan(0);
    // Double cheddar teve quantidade 2
    expect(summary.top_products[0].product_id).toBe('prod-double-cheddar');
    expect(summary.top_products[0].quantity).toBe(2);
  });

  it('does not inflate patties sold when customer buys only beverages and sides', async () => {
    // Adicionar pedido apenas com bebidas e sobremesas
    await OrdersRepository.createOrder({
      customer_name: 'Apenas Bebida e Sobremesa',
      items: [
        { product_id: 'prod-coca-cola', quantity: 3 },
        { product_id: 'prod-brownie', quantity: 2 },
      ],
    });

    const summary = await DashboardService.getDailySummary();
    // Hambúrgueres e carnes continuam os mesmos dos pedidos anteriores (3 burgers, 5 carnes)
    expect(summary.total_burgers_sold).toBe(3);
    expect(summary.total_patties_sold).toBe(5);
    expect(summary.total_orders).toBe(3);
  });

  it('calculates drink attach rate and side attach rate correctly', async () => {
    // Pedido 1: sem bebida, sem batata
    // Pedido 2: com batata
    // Adicionar pedido 3 com bebida:
    await OrdersRepository.createOrder({
      customer_name: 'Cliente com Bebida',
      items: [
        { product_id: 'prod-coca-cola', quantity: 1 },
      ],
    });

    const summary = await DashboardService.getDailySummary();
    expect(summary.total_orders).toBe(3);
    // 1 de 3 pedidos tem bebida = 33%
    expect(summary.drink_attach_rate).toBe(33);
    // 1 de 3 pedidos tem batata/porção = 33%
    expect(summary.side_attach_rate).toBe(33);
  });

  it('provides category breakdown and smart insights', async () => {
    const summary = await DashboardService.getDailySummary();

    expect(summary.category_breakdown.length).toBeGreaterThan(0);
    const burgerCat = summary.category_breakdown.find((c) => c.category === 'burger');
    expect(burgerCat).toBeDefined();
    expect(burgerCat?.total_quantity).toBe(3);

    expect(summary.smart_insights.length).toBeGreaterThan(0);
    expect(summary.kitchen_speed).toBeDefined();
    expect(summary.kitchen_speed.active_orders_count.queued).toBeGreaterThanOrEqual(0);
  });

  it('retrieves global history when targetDate is all', async () => {
    const summary = await DashboardService.getDailySummary('all');
    expect(summary.date).toBe('all');
    expect(summary.total_orders).toBe(2);
    expect(summary.total_revenue).toBe(118.0);
  });
});
