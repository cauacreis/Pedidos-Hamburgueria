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
});
