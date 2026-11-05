import { OrdersRepository } from '../db/ordersRepository';
import { InMemoryDatabaseDriver, setCustomDatabaseDriver, initializeDatabase } from '../db/database';
import { INITIAL_PRODUCTS } from '../db/productsRepository';

describe('OrdersRepository - Local SQLite Transactions & Daily Numbers', () => {
  let inMemoryDriver: InMemoryDatabaseDriver;

  beforeEach(async () => {
    inMemoryDriver = new InMemoryDatabaseDriver();
    inMemoryDriver.seed(INITIAL_PRODUCTS);
    setCustomDatabaseDriver(inMemoryDriver);
    await initializeDatabase(inMemoryDriver);
  });

  it('starts daily sequential number from 1 for the day', async () => {
    const nextNumber = await OrdersRepository.getNextDailyNumber();
    expect(nextNumber).toBe(1);
  });

  it('creates order with items, calculates total and marks synced = false', async () => {
    const order = await OrdersRepository.createOrder({
      customer_name: 'Felipe',
      items: [
        {
          product_id: 'prod-burger-2-carnes', // price: 24.00
          quantity: 2,
          notes: 'Sem cebola',
        },
        {
          product_id: 'prod-refrigerante', // price: 5.00
          quantity: 1,
        },
      ],
    });

    expect(order.daily_number).toBe(1);
    expect(order.customer_name).toBe('Felipe');
    expect(order.total).toBe(53.0); // 24*2 + 5 = 53.00
    expect(order.status).toBe('queued');
    expect(order.synced).toBe(false);
    expect(order.items).toHaveLength(2);

    // Próximo pedido deve ser número 2
    const nextNumber = await OrdersRepository.getNextDailyNumber();
    expect(nextNumber).toBe(2);
  });

  it('updates order status correctly', async () => {
    const order = await OrdersRepository.createOrder({
      customer_name: 'Carlos',
      items: [{ product_id: 'prod-burger-1-carne', quantity: 1 }],
    });

    const success = await OrdersRepository.updateOrderStatus(order.id, 'preparing');
    expect(success).toBe(true);

    const updated = await OrdersRepository.getOrderById(order.id);
    expect(updated?.status).toBe('preparing');
  });

  it('retrieves unsynced orders and marks them as synced', async () => {
    const order1 = await OrdersRepository.createOrder({
      customer_name: 'Order 1',
      items: [{ product_id: 'prod-burger-1-carne', quantity: 1 }],
    });
    const order2 = await OrdersRepository.createOrder({
      customer_name: 'Order 2',
      items: [{ product_id: 'prod-refrigerante', quantity: 2 }],
    });

    const unsynced = await OrdersRepository.getUnsyncedOrders();
    expect(unsynced.length).toBeGreaterThanOrEqual(2);

    await OrdersRepository.markOrdersAsSynced([order1.id, order2.id]);
    const remainingUnsynced = await OrdersRepository.getUnsyncedOrders();
    expect(remainingUnsynced.some((o) => o.id === order1.id || o.id === order2.id)).toBe(false);
  });

  it('correctly increments daily number sequentially across orders and falls back customer name to Balcão', async () => {
    const defaultCustOrder = await OrdersRepository.createOrder({
      customer_name: '   ',
      items: [{ product_id: 'prod-burger-1-carne', quantity: 1 }],
    });

    expect(defaultCustOrder.customer_name).toBe('Balcão');
    expect(defaultCustOrder.daily_number).toBeGreaterThanOrEqual(1);

    const nextNumber = await OrdersRepository.getNextDailyNumber();
    expect(nextNumber).toBe(defaultCustOrder.daily_number + 1);
  });

  it('deletes a single order and its items by id', async () => {
    const order = await OrdersRepository.createOrder({
      customer_name: 'Para Cancelar',
      items: [{ product_id: 'prod-burger-1-carne', quantity: 1 }],
    });

    expect(await OrdersRepository.getOrderById(order.id)).not.toBeNull();

    const deleted = await OrdersRepository.deleteOrder(order.id);
    expect(deleted).toBe(true);

    expect(await OrdersRepository.getOrderById(order.id)).toBeNull();
  });

  it('deletes stale orders older than X hours and leaves recent orders intact', async () => {
    // Pedido antigo (criado há 4 horas)
    const oldOrder = await OrdersRepository.createOrder({
      customer_name: 'Esquecido Há 4h',
      items: [{ product_id: 'prod-burger-1-carne', quantity: 1 }],
    });
    // Forçar created_at para 4 horas atrás
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const db = await inMemoryDriver;
    const rawOrder = inMemoryDriver['orders'].get(oldOrder.id);
    if (rawOrder) {
      rawOrder.created_at = fourHoursAgo;
      inMemoryDriver['orders'].set(oldOrder.id, rawOrder);
    }

    // Pedido recente (criado agora)
    const recentOrder = await OrdersRepository.createOrder({
      customer_name: 'Recente 10min',
      items: [{ product_id: 'prod-burger-2-carnes', quantity: 1 }],
    });

    // Deletar pedidos com mais de 2 horas
    const deletedIds = await OrdersRepository.deleteStaleOrders(2);
    expect(deletedIds).toContain(oldOrder.id);
    expect(deletedIds).not.toContain(recentOrder.id);

    // Verificar que o antigo sumiu e o recente continua ativo
    expect(await OrdersRepository.getOrderById(oldOrder.id)).toBeNull();
    expect(await OrdersRepository.getOrderById(recentOrder.id)).not.toBeNull();
  });
});
