-- ==============================================================================
-- BURGER POS & KDS - SCHEMA SUPABASE / POSTGRESQL (CLOUD SYNC)
-- ==============================================================================
-- Este schema espelha as tabelas locais do SQLite para recepção de sincronização
-- via Outbox Pattern (Batch Upsert com resolução client-wins).
-- ==============================================================================

-- 1. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    patty_count INTEGER NOT NULL DEFAULT 1,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    daily_number INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'preparing', 'ready', 'delivered')),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE ITENS DO PEDIDO
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_supabase_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_supabase_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supabase_order_items_order_id ON order_items(order_id);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para os food trucks autenticados ou chave anon de serviço
CREATE POLICY "Permitir leitura pública de produtos" 
    ON products FOR SELECT USING (true);

CREATE POLICY "Permitir sincronização de pedidos" 
    ON orders FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir sincronização de itens" 
    ON order_items FOR ALL USING (true) WITH CHECK (true);
