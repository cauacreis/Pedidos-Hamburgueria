import { getDatabase } from './database';
import { CreateOrderInput, Order, OrderItem, OrderStatus, Product } from '../types/database';

export class OrdersRepository {
  /**
   * Obtém o próximo número diário (#01, #02...) para a data corrente
   */
  static async getNextDailyNumber(): Promise<number> {
    const db = await getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const row = await db.getFirstAsync<{ max_number: number | null }>(
      `SELECT MAX(daily_number) as max_number FROM orders WHERE DATE(created_at) = ?`,
      [today]
    );

    if (row && typeof row.max_number === 'number' && row.max_number > 0) {
      return row.max_number + 1;
    }
    return 1;
  }

  /**
   * Cria um novo pedido com seus itens atomicamente
   */
  static async createOrder(input: CreateOrderInput): Promise<Order> {
    const db = await getDatabase();
    const dailyNumber = await this.getNextDailyNumber();
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // Buscar produtos do banco para calcular valores reais
    const allProducts = await db.getAllAsync<Product>('SELECT * FROM products');
    const productMap = new Map<string, Product>();
    for (const p of allProducts) {
      productMap.set(p.id, p);
    }

    let calculatedTotal = 0;
    const itemsToInsert: OrderItem[] = [];

    for (const itemInput of input.items) {
      const product = productMap.get(itemInput.product_id);
      const price = product ? product.price : 0;
      calculatedTotal += price * itemInput.quantity;

      const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      itemsToInsert.push({
        id: itemId,
        order_id: orderId,
        product_id: itemInput.product_id,
        quantity: itemInput.quantity,
        notes: itemInput.notes || '',
        synced: false,
        product_name: product?.name || 'Item',
        product_price: price,
        patty_count: product?.patty_count || 0,
      });
    }

    const order: Order = {
      id: orderId,
      daily_number: dailyNumber,
      customer_name: input.customer_name.trim() || 'Balcão',
      total: Number(calculatedTotal.toFixed(2)),
      status: 'queued',
      created_at: now,
      synced: false,
      items: itemsToInsert,
    };

    await db.withTransactionAsync(async () => {
      // Inserir Order
      await db.runAsync(
        `INSERT INTO orders (id, daily_number, customer_name, total, status, created_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [order.id, order.daily_number, order.customer_name, order.total, order.status, order.created_at]
      );

      // Inserir Order Items
      for (const item of itemsToInsert) {
        await db.runAsync(
          `INSERT INTO order_items (id, order_id, product_id, quantity, notes, synced)
           VALUES (?, ?, ?, ?, ?, 0)`,
          [item.id, item.order_id, item.product_id, item.quantity, item.notes || '']
        );
      }
    });

    return order;
  }

  /**
   * Busca um pedido específico com seus itens
   */
  static async getOrderById(orderId: string): Promise<Order | null> {
    const db = await getDatabase();
    const orderRow = await db.getFirstAsync<any>(
      `SELECT * FROM orders WHERE id = ?`,
      [orderId]
    );

    if (!orderRow) return null;

    const items = await this.getOrderItems(orderId);

    return {
      id: orderRow.id,
      daily_number: Number(orderRow.daily_number),
      customer_name: orderRow.customer_name,
      total: Number(orderRow.total),
      status: orderRow.status as OrderStatus,
      created_at: orderRow.created_at,
      synced: Boolean(orderRow.synced),
      items,
    };
  }

  /**
   * Busca itens de um pedido com dados do produto associado
   */
  static async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const db = await getDatabase();
    const items = await db.getAllAsync<any>(
      `SELECT oi.*, p.name as product_name, p.price as product_price, p.patty_count
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    return items.map((i) => ({
      id: i.id,
      order_id: i.order_id,
      product_id: i.product_id,
      quantity: Number(i.quantity),
      notes: i.notes || '',
      synced: Boolean(i.synced),
      product_name: i.product_name,
      product_price: Number(i.product_price),
      patty_count: Number(i.patty_count || 0),
    }));
  }

  /**
   * Busca pedidos ativos para a fila de cozinha (queued, preparing, ready)
   */
  static async getActiveKitchenOrders(): Promise<Order[]> {
    const db = await getDatabase();
    const orders = await db.getAllAsync<any>(
      `SELECT * FROM orders
       WHERE status IN ('queued', 'preparing', 'ready')
       ORDER BY created_at ASC`
    );

    const fullOrders: Order[] = [];
    for (const ord of orders) {
      const items = await this.getOrderItems(ord.id);
      fullOrders.push({
        id: ord.id,
        daily_number: Number(ord.daily_number),
        customer_name: ord.customer_name,
        total: Number(ord.total),
        status: ord.status as OrderStatus,
        created_at: ord.created_at,
        synced: Boolean(ord.synced),
        items,
      });
    }

    return fullOrders;
  }

  /**
   * Atualiza status de um pedido
   */
  static async updateOrderStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `UPDATE orders SET status = ?, synced = 0 WHERE id = ?`,
      [status, orderId]
    );
    return result.changes > 0;
  }

  /**
   * Busca todos os pedidos pendentes de sincronização
   */
  static async getUnsyncedOrders(): Promise<Order[]> {
    const db = await getDatabase();
    const orders = await db.getAllAsync<any>(
      `SELECT * FROM orders WHERE synced = 0 ORDER BY created_at ASC`
    );

    const fullOrders: Order[] = [];
    for (const ord of orders) {
      const items = await this.getOrderItems(ord.id);
      fullOrders.push({
        id: ord.id,
        daily_number: Number(ord.daily_number),
        customer_name: ord.customer_name,
        total: Number(ord.total),
        status: ord.status as OrderStatus,
        created_at: ord.created_at,
        synced: false,
        items,
      });
    }

    return fullOrders;
  }

  /**
   * Marca pedidos como sincronizados
   */
  static async markOrdersAsSynced(orderIds: string[]): Promise<void> {
    if (orderIds.length === 0) return;
    const db = await getDatabase();
    for (const id of orderIds) {
      await db.runAsync(`UPDATE orders SET synced = 1 WHERE id = ?`, [id]);
    }
  }

  /**
   * Marca itens como sincronizados
   */
  static async markItemsAsSynced(itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    const db = await getDatabase();
    for (const id of itemIds) {
      await db.runAsync(`UPDATE order_items SET synced = 1 WHERE id = ?`, [id]);
    }
  }

  /**
   * Busca todos os pedidos (para o Caixa / Histórico)
   */
  static async getAllOrders(): Promise<Order[]> {
    const db = await getDatabase();
    const orders = await db.getAllAsync<any>(
      `SELECT * FROM orders ORDER BY created_at DESC LIMIT 100`
    );

    const fullOrders: Order[] = [];
    for (const ord of orders) {
      const items = await this.getOrderItems(ord.id);
      fullOrders.push({
        id: ord.id,
        daily_number: Number(ord.daily_number),
        customer_name: ord.customer_name,
        total: Number(ord.total),
        status: ord.status as OrderStatus,
        created_at: ord.created_at,
        synced: Boolean(ord.synced),
        items,
      });
    }

    return fullOrders;
  }
}
