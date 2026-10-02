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

export interface CategoryBreakdown {
  category: ProductCategory;
  category_name: string;
  total_revenue: number;
  total_quantity: number;
  percentage_revenue: number;
}

export interface KitchenSpeedMetrics {
  avg_prep_time_minutes: number;
  active_orders_count: {
    queued: number;
    preparing: number;
    ready: number;
    delivered: number;
  };
  patties_per_hour: number;
}

export interface SmartInsight {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'highlight';
  icon: string;
}

export interface DailySummary {
  date: string;
  total_revenue: number;
  total_orders: number;
  total_burgers_sold: number;
  total_patties_sold: number;
  average_ticket: number;
  drink_attach_rate: number;
  side_attach_rate: number;
  category_breakdown: CategoryBreakdown[];
  kitchen_speed: KitchenSpeedMetrics;
  smart_insights: SmartInsight[];
  peak_hours: { hour: number; order_count: number; revenue: number }[];
  top_products: { product_id: string; product_name: string; quantity: number; total_revenue: number }[];
}
