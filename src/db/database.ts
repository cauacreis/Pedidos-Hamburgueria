import { SCHEMA_SQL } from './schema';
import { INITIAL_PRODUCTS } from './productsRepository';
import { Product } from '../types/database';
import { getLocalDateString } from '../utils/date';

export interface DatabaseDriver {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null>;
  withTransactionAsync(cb: () => Promise<void>): Promise<void>;
}

// In-memory driver for unit testing, web fallback, or environments without native SQLite
export class InMemoryDatabaseDriver implements DatabaseDriver {
  private products: Map<string, Product> = new Map();
  private orders: Map<string, any> = new Map();
  private orderItems: Map<string, any> = new Map();

  async execAsync(sql: string): Promise<void> {
    // Schema creation is a no-op in-memory
  }

  async runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.startsWith('INSERT INTO PRODUCTS')) {
      const [id, name, price, patty_count, category, description] = params;
      this.products.set(id, { id, name, price, patty_count, category, description });
      return { lastInsertRowId: this.products.size, changes: 1 };
    }

    if (trimmed.startsWith('INSERT INTO ORDERS')) {
      const [id, daily_number, customer_name, total, status, created_at, synced] = params;
      this.orders.set(id, {
        id,
        daily_number,
        customer_name,
        total,
        status,
        created_at,
        synced: synced ?? 0,
      });
      return { lastInsertRowId: this.orders.size, changes: 1 };
    }

    if (trimmed.startsWith('INSERT INTO ORDER_ITEMS')) {
      const [id, order_id, product_id, quantity, notes, synced] = params;
      this.orderItems.set(id, {
        id,
        order_id,
        product_id,
        quantity,
        notes,
        synced: synced ?? 0,
      });
      return { lastInsertRowId: this.orderItems.size, changes: 1 };
    }

    if (trimmed.startsWith('UPDATE ORDERS SET STATUS')) {
      const [status, id] = params;
      const order = this.orders.get(id);
      if (order) {
        order.status = status;
        this.orders.set(id, order);
        return { lastInsertRowId: 0, changes: 1 };
      }
      return { lastInsertRowId: 0, changes: 0 };
    }

    if (trimmed.startsWith('UPDATE ORDERS SET SYNCED = 1')) {
      if (params.length === 1) {
        const order = this.orders.get(params[0]);
        if (order) {
          order.synced = 1;
          return { lastInsertRowId: 0, changes: 1 };
        }
      } else {
        let count = 0;
        for (const order of this.orders.values()) {
          if (order.synced === 0) {
            order.synced = 1;
            count++;
          }
        }
        return { lastInsertRowId: 0, changes: count };
      }
    }

    if (trimmed.startsWith('UPDATE ORDER_ITEMS SET SYNCED = 1')) {
      let count = 0;
      for (const item of this.orderItems.values()) {
        if (item.synced === 0) {
          item.synced = 1;
          count++;
        }
      }
      return { lastInsertRowId: 0, changes: count };
    }

    if (trimmed.startsWith('DELETE FROM ORDERS')) {
      const count = this.orders.size;
      this.orders.clear();
      this.orderItems.clear();
      return { lastInsertRowId: 0, changes: count };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.includes('FROM PRODUCTS')) {
      return Array.from(this.products.values()) as unknown as T[];
    }

    if (trimmed.includes('FROM ORDERS') && trimmed.includes('SYNCED = 0')) {
      return Array.from(this.orders.values()).filter((o) => o.synced === 0) as unknown as T[];
    }

    if (trimmed.includes('FROM ORDER_ITEMS') && trimmed.includes('SYNCED = 0')) {
      return Array.from(this.orderItems.values()).filter((i) => i.synced === 0) as unknown as T[];
    }

    if (trimmed.includes('FROM ORDER_ITEMS') && trimmed.includes('JOIN ORDERS')) {
      const targetDate = params[0];
      const result: any[] = [];
      for (const item of this.orderItems.values()) {
        const order = this.orders.get(item.order_id);
        if (!order) continue;
        const orderDateLocal = order.created_at ? getLocalDateString(new Date(order.created_at)) : '';
        const orderDateUtc = order.created_at ? order.created_at.split('T')[0] : '';
        if (!targetDate || orderDateLocal === targetDate || orderDateUtc === targetDate) {
          const prod = this.products.get(item.product_id);
          result.push({
            ...item,
            synced: Boolean(item.synced),
            product_name: prod?.name || 'Item',
            product_price: prod?.price || 0,
            price: prod?.price || 0,
            category: prod?.category || 'burger',
            patty_count: prod?.patty_count || 0,
          });
        }
      }
      return result as unknown as T[];
    }

    if (trimmed.includes('FROM ORDER_ITEMS WHERE ORDER_ID = ?')) {
      const orderId = params[0];
      const items = Array.from(this.orderItems.values()).filter((i) => i.order_id === orderId);
      // Join product info
      const enriched = items.map((i) => {
        const prod = this.products.get(i.product_id);
        return {
          ...i,
          synced: Boolean(i.synced),
          product_name: prod?.name || 'Item',
          product_price: prod?.price || 0,
          category: prod?.category || 'burger',
          patty_count: prod?.patty_count || 0,
        };
      });
      return enriched as unknown as T[];
    }

    if (trimmed.includes('FROM ORDERS WHERE STATUS IN')) {
      const active = Array.from(this.orders.values()).filter(
        (o) => o.status === 'queued' || o.status === 'preparing' || o.status === 'ready'
      );
      return active.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) as unknown as T[];
    }

    if (trimmed.includes('FROM ORDERS') && trimmed.includes('DATE(')) {
      const targetDate = params[0];
      const filtered = Array.from(this.orders.values()).filter((order) => {
        const orderDateLocal = order.created_at ? getLocalDateString(new Date(order.created_at)) : '';
        const orderDateUtc = order.created_at ? order.created_at.split('T')[0] : '';
        return !targetDate || orderDateLocal === targetDate || orderDateUtc === targetDate;
      });
      return filtered.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) as unknown as T[];
    }

    if (trimmed.includes('FROM ORDERS')) {
      return Array.from(this.orders.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) as unknown as T[];
    }

    return [] as T[];
  }

  async getFirstAsync<T>(sql: string, params: any[] = []): Promise<T | null> {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.includes('MAX(DAILY_NUMBER)') && trimmed.includes('DATE(CREATED_AT')) {
      const today = params[0];
      let maxNum = 0;
      for (const order of this.orders.values()) {
        const orderDateLocal = order.created_at ? getLocalDateString(new Date(order.created_at)) : '';
        const orderDateUtc = order.created_at ? order.created_at.split('T')[0] : '';
        if ((orderDateLocal === today || orderDateUtc === today) && order.daily_number > maxNum) {
          maxNum = order.daily_number;
        }
      }
      return { max_number: maxNum } as unknown as T;
    }

    if (trimmed.includes('FROM ORDERS WHERE ID = ?')) {
      const id = params[0];
      const order = this.orders.get(id);
      return (order as unknown as T) || null;
    }

    if (trimmed.includes('FROM PRODUCTS WHERE ID = ?')) {
      const id = params[0];
      const prod = this.products.get(id);
      return (prod as unknown as T) || null;
    }

    return null;
  }

  async withTransactionAsync(cb: () => Promise<void>): Promise<void> {
    await cb();
  }

  // Helper for tests to pre-seed
  seed(products: Product[]) {
    for (const p of products) {
      this.products.set(p.id, p);
    }
  }

  clear() {
    this.products.clear();
    this.orders.clear();
    this.orderItems.clear();
  }
}

// Global active database instance
let activeDriver: DatabaseDriver | null = null;

export async function getDatabase(): Promise<DatabaseDriver> {
  if (activeDriver) {
    return activeDriver;
  }

  try {
    // Dynamic import to allow running in Node/Jest without crashing
    const SQLite = require('expo-sqlite');
    if (SQLite && typeof SQLite.openDatabaseAsync === 'function') {
      const db = await SQLite.openDatabaseAsync('foodtruck_pos.db');
      activeDriver = {
        execAsync: (sql: string) => db.execAsync(sql),
        runAsync: (sql: string, params: any[] = []) => db.runAsync(sql, params),
        getAllAsync: <T>(sql: string, params: any[] = []) => db.getAllAsync(sql, params),
        getFirstAsync: <T>(sql: string, params: any[] = []) => db.getFirstAsync(sql, params),
        withTransactionAsync: (cb: () => Promise<void>) => db.withTransactionAsync(cb),
      };
    } else {
      activeDriver = new InMemoryDatabaseDriver();
    }
  } catch (err) {
    activeDriver = new InMemoryDatabaseDriver();
  }

  await initializeDatabase(activeDriver);
  return activeDriver;
}

export function setCustomDatabaseDriver(driver: DatabaseDriver): void {
  activeDriver = driver;
}

export async function initializeDatabase(driver: DatabaseDriver): Promise<void> {
  await driver.execAsync(SCHEMA_SQL.createProductsTable);
  await driver.execAsync(SCHEMA_SQL.createOrdersTable);
  await driver.execAsync(SCHEMA_SQL.createOrderItemsTable);
  await driver.execAsync(SCHEMA_SQL.createIndexes);

  // Seed produtos se vazios
  const existingProducts = await driver.getAllAsync<Product>('SELECT id FROM products LIMIT 1');
  if (!existingProducts || existingProducts.length === 0) {
    for (const product of INITIAL_PRODUCTS) {
      await driver.runAsync(
        `INSERT OR IGNORE INTO products (id, name, price, patty_count, category, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.name,
          product.price,
          product.patty_count,
          product.category,
          product.description || '',
        ]
      );
    }
  }
}
