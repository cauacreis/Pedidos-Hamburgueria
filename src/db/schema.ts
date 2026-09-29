export const SCHEMA_SQL = {
  createProductsTable: `
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      patty_count INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL,
      description TEXT
    );
  `,
  createOrdersTable: `
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      daily_number INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `,
  createOrderItemsTable: `
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      notes TEXT,
      synced INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id)
    );
  `,
  createIndexes: `
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_synced ON order_items(synced);
  `,
};
