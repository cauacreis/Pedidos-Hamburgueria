import { getDatabase } from '../db/database';
import { DailySummary, CategoryBreakdown, KitchenSpeedMetrics, SmartInsight, ProductCategory } from '../types/database';
import { getLocalDateString } from '../utils/date';

const CATEGORY_NAMES: Record<ProductCategory, string> = {
  burger: 'Hambúrgueres',
  drink: 'Bebidas & Sucos',
  side: 'Porções & Batatas',
  combo: 'Combos Especiais',
  dessert: 'Sobremesas',
};

export class DashboardService {
  /**
   * Calcula o resumo financeiro diário e métricas operacionais 100% offline
   * Suporta filtro por data específica ou 'all' para visão global histórica
   */
  static async getDailySummary(targetDate?: string): Promise<DailySummary> {
    const db = await getDatabase();
    const isAll = targetDate === 'all';
    const dateStr = isAll ? 'all' : (targetDate || getLocalDateString());

    // 1. Buscar pedidos conforme filtro
    let orders: any[] = [];
    if (isAll) {
      orders = await db.getAllAsync<any>(
        `SELECT * FROM orders ORDER BY created_at DESC`
      );
    } else {
      orders = await db.getAllAsync<any>(
        `SELECT * FROM orders WHERE (DATE(created_at, 'localtime') = ? OR DATE(created_at) = ?) ORDER BY created_at DESC`,
        [dateStr, dateStr]
      );
    }

    let totalRevenue = 0;
    const totalOrders = orders.length;

    // Contadores de status da operação
    const statusCounts = {
      queued: 0,
      preparing: 0,
      ready: 0,
      delivered: 0,
    };

    // Horários de pico (24 horas)
    const hoursMap = new Map<number, { order_count: number; revenue: number }>();
    for (let h = 0; h < 24; h++) {
      hoursMap.set(h, { order_count: 0, revenue: 0 });
    }

    for (const ord of orders) {
      const rev = Number(ord.total || 0);
      totalRevenue += rev;

      const st = ord.status as keyof typeof statusCounts;
      if (statusCounts[st] !== undefined) {
        statusCounts[st]++;
      }

      const orderHour = new Date(ord.created_at).getHours();
      const hourStat = hoursMap.get(orderHour) || { order_count: 0, revenue: 0 };
      hourStat.order_count += 1;
      hourStat.revenue += rev;
      hoursMap.set(orderHour, hourStat);
    }

    // 2. Buscar itens para calcular hambúrgueres, carnes, categorias e cross-sell
    let items: any[] = [];
    if (isAll) {
      items = await db.getAllAsync<any>(
        `SELECT oi.*, p.name as product_name, p.category, p.patty_count, p.price, o.created_at as order_created_at
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         LEFT JOIN products p ON oi.product_id = p.id`
      );
    } else {
      items = await db.getAllAsync<any>(
        `SELECT oi.*, p.name as product_name, p.category, p.patty_count, p.price, o.created_at as order_created_at
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.id
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE (DATE(o.created_at, 'localtime') = ? OR DATE(o.created_at) = ?)`,
        [dateStr, dateStr]
      );
    }

    let totalBurgersSold = 0;
    let totalPattiesSold = 0;
    const productStats = new Map<string, { product_id: string; product_name: string; quantity: number; total_revenue: number }>();

    // Mapeamento por categoria
    const categoryStats = new Map<ProductCategory, { category: ProductCategory; total_revenue: number; total_quantity: number }>();
    (['burger', 'drink', 'side', 'combo', 'dessert'] as ProductCategory[]).forEach((cat) => {
      categoryStats.set(cat, { category: cat, total_revenue: 0, total_quantity: 0 });
    });

    // Rastrear pedidos com bebidas e porções (Attach Rate)
    const ordersWithDrinks = new Set<string>();
    const ordersWithSides = new Set<string>();

    for (const item of items) {
      const qty = Number(item.quantity || 0);
      const category = (item.category as ProductCategory) || 'burger';
      const isBurger = category === 'burger' || (item.patty_count && item.patty_count > 0);

      if (isBurger) {
        totalBurgersSold += qty;
        totalPattiesSold += qty * Number(item.patty_count ?? 0);
      }

      if (category === 'drink') {
        ordersWithDrinks.add(item.order_id);
      }
      if (category === 'side') {
        ordersWithSides.add(item.order_id);
      }

      // Estatísticas de Categoria
      const catStat = categoryStats.get(category) || { category, total_revenue: 0, total_quantity: 0 };
      const itemRev = qty * Number(item.price || 0);
      catStat.total_quantity += qty;
      catStat.total_revenue += itemRev;
      categoryStats.set(category, catStat);

      // Ranking de Produtos
      const prodId = item.product_id;
      const current = productStats.get(prodId) || {
        product_id: prodId,
        product_name: item.product_name || 'Produto',
        quantity: 0,
        total_revenue: 0,
      };

      current.quantity += qty;
      current.total_revenue += itemRev;
      productStats.set(prodId, current);
    }

    // Top Produtos
    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Horários de Pico
    const peakHours = Array.from(hoursMap.entries())
      .map(([hour, stats]) => ({
        hour,
        order_count: stats.order_count,
        revenue: Number(stats.revenue.toFixed(2)),
      }))
      .filter((h) => h.order_count > 0)
      .sort((a, b) => a.hour - b.hour);

    const averageTicket = totalOrders > 0 ? Number((totalRevenue / totalOrders).toFixed(2)) : 0;
    const drinkAttachRate = totalOrders > 0 ? Math.round((ordersWithDrinks.size / totalOrders) * 100) : 0;
    const sideAttachRate = totalOrders > 0 ? Math.round((ordersWithSides.size / totalOrders) * 100) : 0;

    // Detalhamento de Categorias (% de faturamento)
    const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryStats.values())
      .filter((c) => c.total_quantity > 0)
      .map((c) => ({
        category: c.category,
        category_name: CATEGORY_NAMES[c.category] || c.category,
        total_revenue: Number(c.total_revenue.toFixed(2)),
        total_quantity: c.total_quantity,
        percentage_revenue: totalRevenue > 0 ? Math.round((c.total_revenue / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue);

    // Métricas de Cozinha e Chapa
    const activeHoursCount = Math.max(peakHours.length, 1);
    const pattiesPerHour = Number((totalPattiesSold / activeHoursCount).toFixed(1));
    const completedOrders = statusCounts.ready + statusCounts.delivered;
    // Estimativa de tempo médio por pedido: 6.5 a 10 min dependendo do volume
    const avgPrepMinutes = completedOrders > 0 ? Number(Math.min(15, Math.max(5, 5 + totalPattiesSold / completedOrders * 1.5)).toFixed(1)) : 0;

    const kitchenSpeed: KitchenSpeedMetrics = {
      avg_prep_time_minutes: avgPrepMinutes,
      active_orders_count: statusCounts,
      patties_per_hour: pattiesPerHour,
    };

    // 3. Gerar Insights Inteligentes & Acionáveis
    const smartInsights: SmartInsight[] = [];

    // Insight 1: Horário de Pico
    if (peakHours.length > 0) {
      const bestHour = [...peakHours].sort((a, b) => b.order_count - a.order_count)[0];
      smartInsights.push({
        id: 'peak_insight',
        title: 'Horário de Maior Fluxo',
        description: `Pico registrado às ${String(bestHour.hour).padStart(2, '0')}:00 com ${bestHour.order_count} pedidos gerando R$ ${bestHour.revenue.toFixed(2)}.`,
        type: 'highlight',
        icon: 'Flame',
      });
    }

    // Insight 2: Cross-sell de Bebidas (Attach Rate)
    if (totalOrders > 0) {
      if (drinkAttachRate >= 65) {
        smartInsights.push({
          id: 'drink_high',
          title: 'Alta Conversão de Bebidas',
          description: `${drinkAttachRate}% dos clientes incluíram bebidas no pedido. Excelente índice de combo!`,
          type: 'success',
          icon: 'CheckCircle2',
        });
      } else {
        smartInsights.push({
          id: 'drink_low',
          title: 'Oportunidade de Combos',
          description: `Apenas ${drinkAttachRate}% dos pedidos têm bebidas. Sugerir bebidas no fechamento pode aumentar o faturamento em até 20%.`,
          type: 'warning',
          icon: 'TrendingUp',
        });
      }
    }

    // Insight 3: Produto Mais Vendido
    if (topProducts.length > 0) {
      const champ = topProducts[0];
      const champPercent = totalBurgersSold > 0 ? Math.round((champ.quantity / totalBurgersSold) * 100) : 0;
      smartInsights.push({
        id: 'top_product',
        title: 'Carro-chefe do Cardápio',
        description: `${champ.product_name} responde por ${champPercent}% de todos os hambúrgueres vendidos hoje (${champ.quantity} unidades).`,
        type: 'info',
        icon: 'Award',
      });
    }

    // Insight 4: Ritmo de Produção na Chapa
    if (totalPattiesSold > 0) {
      smartInsights.push({
        id: 'grill_cadence',
        title: 'Vazão da Chapa',
        description: `${totalPattiesSold} carnes grelhadas no turno. Média de ${pattiesPerHour} carnes por hora de operação.`,
        type: 'info',
        icon: 'Timer',
      });
    }

    return {
      date: dateStr,
      total_revenue: Number(totalRevenue.toFixed(2)),
      total_orders: totalOrders,
      total_burgers_sold: totalBurgersSold,
      total_patties_sold: totalPattiesSold,
      average_ticket: averageTicket,
      drink_attach_rate: drinkAttachRate,
      side_attach_rate: sideAttachRate,
      category_breakdown: categoryBreakdown,
      kitchen_speed: kitchenSpeed,
      smart_insights: smartInsights,
      peak_hours: peakHours,
      top_products: topProducts,
    };
  }
}
