export type ProductCategory = 'burger' | 'drink' | 'side' | 'combo' | 'dessert';

export interface Product {
  id: string;
  name: string;
  price: number;
  patty_count: number; // Quantas carnes esse hambúrguer leva (0 para bebidas/acompanhamentos)
  category: ProductCategory;
  description?: string;
}

export type OrderStatus = 'queued' | 'preparing' | 'ready' | 'delivered';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  notes?: string;
  synced: boolean;
  // Joins para exibição
  product_name?: string;
  product_price?: number;
  patty_count?: number;
}

export interface Order {
  id: string;
  daily_number: number; // Senha diária sequencial (#01, #02...)
  customer_name: string;
  total: number;
  status: OrderStatus;
  created_at: string; // ISO 8601 string
  synced: boolean;
  items?: OrderItem[];
}

export interface CreateOrderItemInput {
  product_id: string;
  quantity: number;
  notes?: string;
}

export interface CreateOrderInput {
  customer_name: string;
  items: CreateOrderItemInput[];
}

export interface DailySummary {
  date: string;
  total_revenue: number;
  total_orders: number;
  total_burgers_sold: number;
  total_patties_sold: number;
  average_ticket: number;
  peak_hours: { hour: number; order_count: number; revenue: number }[];
  top_products: { product_id: string; product_name: string; quantity: number; total_revenue: number }[];
}
