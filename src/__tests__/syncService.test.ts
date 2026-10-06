import { SupabaseSyncService } from '../services/syncService';
import { OrdersRepository } from '../db/ordersRepository';
import { InMemoryDatabaseDriver, setCustomDatabaseDriver, initializeDatabase } from '../db/database';
import { INITIAL_PRODUCTS } from '../db/productsRepository';

describe('SupabaseSyncService - Outbox Pattern Synchronization', () => {
  let inMemoryDriver: InMemoryDatabaseDriver;

  beforeEach(async () => {
    inMemoryDriver = new InMemoryDatabaseDriver();
    inMemoryDriver.seed(INITIAL_PRODUCTS);
    setCustomDatabaseDriver(inMemoryDriver);
    await initializeDatabase(inMemoryDriver);
  });

  it('correctly batches unsynced records and updates local synced status upon success', async () => {
    // Criar pedido não sincronizado
    const order = await OrdersRepository.createOrder({
      customer_name: 'Sync Test Customer',
      items: [{ product_id: 'prod-burger-1-carne', quantity: 1 }],
    });

    expect(order.synced).toBe(false);

    // Mock do Supabase Client
    const upsertedOrders: any[] = [];
    const upsertedItems: any[] = [];

    const mockSupabaseClient: any = {
      from: (tableName: string) => ({
        upsert: async (payload: any[]) => {
          if (tableName === 'orders') {
            upsertedOrders.push(...payload);
          } else if (tableName === 'order_items') {
            upsertedItems.push(...payload);
          }
          return { error: null };
        },
      }),
    };

    const syncService = SupabaseSyncService.getInstance();
    const result = await syncService.syncOutbox(mockSupabaseClient);

    expect(result.success).toBe(true);
    expect(result.ordersSynced).toBe(1);
    expect(upsertedOrders).toHaveLength(1);
    expect(upsertedOrders[0].id).toBe(order.id);
    expect(upsertedOrders[0].customer_name).toBe('Sync Test Customer');

    // Verificar se no SQLite local o registro foi marcado como synced
    const unsyncedAfter = await OrdersRepository.getUnsyncedOrders();
    expect(unsyncedAfter.some((o) => o.id === order.id)).toBe(false);
  });
});
