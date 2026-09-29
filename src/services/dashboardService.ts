import { getDatabase } from '../db/database';
import { DailySummary } from '../types/database';

export class DashboardService {
  /**
   * Calcula o resumo financeiro diário e métricas operacionais 100% offline
   */
  static async getDailySummary(targetDate?: string): Promise<DailySummary> {
    const db = await getDatabase();
    const dateStr = targetDate || new Date().toISOString().split('T')[0];

    // Buscar todos os pedidos da data
    const orders = await db.getAllAsync<any>(
      `SELECT * FROM orders WHERE DATE(created_at) = ?`,
      [dateStr]
    );

    let totalRevenue = 0;
    const totalOrders = orders.length;

    // Horários de pico (24 horas)
    const hoursMap = new Map<number, { order_count: number; revenue: number }>();
    for (let h = 0; h < 24; h++) {
      hoursMap.set(h, { order_count: 0, revenue: 0 });
    }

    for (const ord of orders) {
      const rev = Number(ord.total || 0);
      totalRevenue += rev;

      const orderHour = new Date(ord.created_at).getHours();
      const hourStat = hoursMap.get(orderHour) || { order_count: 0, revenue: 0 };
      hourStat.order_count += 1;
      hourStat.revenue += rev;
      hoursMap.set(orderHour, hourStat);
    }

    // Buscar itens para calcular hambúrgueres e carnes vendidas
    const items = await db.getAllAsync<any>(
      `SELECT oi.*, p.name as product_name, p.category, p.patty_count, p.price
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE DATE(o.created_at) = ?`,
      [dateStr]
    );

    let totalBurgersSold = 0;
    let totalPattiesSold = 0;
    const productStats = new Map<string, { product_id: string; product_name: string; quantity: number; total_revenue: number }>();

    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const isBurger = item.category === 'burger' || (item.patty_count && item.patty_count > 0);

      if (isBurger) {
        totalBurgersSold += qty;
        totalPattiesSold += qty * Number(item.patty_count || 1);
      }

      const prodId = item.product_id;
      const current = productStats.get(prodId) || {
        product_id: prodId,
        product_name: item.product_name || 'Produto',
        quantity: 0,
        total_revenue: 0,
      };

      current.quantity += qty;
      current.total_revenue += qty * Number(item.price || 0);
      productStats.set(prodId, current);
    }

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const peakHours = Array.from(hoursMap.entries())
      .map(([hour, stats]) => ({
        hour,
        order_count: stats.order_count,
        revenue: Number(stats.revenue.toFixed(2)),
      }))
      .filter((h) => h.order_count > 0)
      .sort((a, b) => a.hour - b.hour);

    const averageTicket = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;

    return {
      date: dateStr,
      total_revenue: Number(totalRevenue.toFixed(2)),
      total_orders: totalOrders,
      total_burgers_sold: totalBurgersSold,
      total_patties_sold: totalPattiesSold,
      average_ticket: averageTicket,
      peak_hours: peakHours,
      top_products: topProducts,
    };
  }
}
