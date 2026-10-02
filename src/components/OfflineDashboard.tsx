import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  TrendingUp,
  Flame,
  Award,
  Clock,
  ShoppingBag,
  Utensils,
  CheckCircle2,
  RefreshCw,
  Coffee,
  Zap,
} from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { DailySummary } from '../types/database';
import { DashboardService } from '../services/dashboardService';

export const OfflineDashboard: React.FC = () => {
  const [period, setPeriod] = useState<'today' | 'all'>('today');
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async (selectedPeriod: 'today' | 'all' = period) => {
    setLoading(true);
    try {
      const data = await DashboardService.getDailySummary(selectedPeriod === 'all' ? 'all' : undefined);
      setSummary(data);
    } catch {
      // Falha silenciosa
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(period);
  }, [period]);

  const handlePeriodChange = (newPeriod: 'today' | 'all') => {
    setPeriod(newPeriod);
  };

  if (loading && !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Carregando métricas...</Text>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyNotice}>Não foi possível carregar os dados.</Text>
      </View>
    );
  }

  const maxHourlyOrders = Math.max(...summary.peak_hours.map((h) => h.order_count), 1);
  const { kitchen_speed } = summary;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Top Header & Seletor de Período */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Faturamento & Operação</Text>
          <Text style={styles.subtitle}>
            {period === 'today' ? 'Visão consolidada do turno de hoje' : 'Histórico global acumulado'}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchSummary(period)} activeOpacity={0.8}>
          <RefreshCw size={14} color={THEME.colors.textPrimary} />
          <Text style={styles.refreshBtnText}>Atualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs de Filtro de Período */}
      <View style={styles.periodTabsRow}>
        <TouchableOpacity
          style={[styles.periodTab, period === 'today' && styles.periodTabActive]}
          onPress={() => handlePeriodChange('today')}
          activeOpacity={0.8}
        >
          <Text style={[styles.periodTabText, period === 'today' && styles.periodTabTextActive]}>
            Turno Atual (Hoje)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.periodTab, period === 'all' && styles.periodTabActive]}
          onPress={() => handlePeriodChange('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.periodTabText, period === 'all' && styles.periodTabTextActive]}>
            Histórico Geral
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pulso Operacional da Cozinha (Status da Fila em Tempo Real) */}
      <View style={styles.pulseCard}>
        <View style={styles.pulseHeader}>
          <View style={styles.pulseHeaderLeft}>
            <Zap size={16} color={THEME.colors.warning} />
            <Text style={styles.pulseTitle}>Pulso da Chapa & Atendimento</Text>
          </View>
          <Text style={styles.pulseSpeedBadge}>
            ⚡ {kitchen_speed.avg_prep_time_minutes > 0 ? `${kitchen_speed.avg_prep_time_minutes} min médio` : 'Operação Ágil'}
          </Text>
        </View>

        <View style={styles.pulseChipsRow}>
          <View style={[styles.pulseChip, { borderColor: THEME.colors.warning }]}>
            <Text style={[styles.pulseChipNumber, { color: THEME.colors.warning }]}>
              {kitchen_speed.active_orders_count.queued}
            </Text>
            <Text style={styles.pulseChipLabel}>Na Fila</Text>
          </View>

          <View style={[styles.pulseChip, { borderColor: THEME.colors.grillAmber }]}>
            <Text style={[styles.pulseChipNumber, { color: THEME.colors.grillAmber }]}>
              {kitchen_speed.active_orders_count.preparing}
            </Text>
            <Text style={styles.pulseChipLabel}>Na Chapa</Text>
          </View>

          <View style={[styles.pulseChip, { borderColor: THEME.colors.primary }]}>
            <Text style={[styles.pulseChipNumber, { color: THEME.colors.primary }]}>
              {kitchen_speed.active_orders_count.ready}
            </Text>
            <Text style={styles.pulseChipLabel}>Prontos</Text>
          </View>

          <View style={[styles.pulseChip, { borderColor: THEME.colors.success }]}>
            <Text style={[styles.pulseChipNumber, { color: THEME.colors.success }]}>
              {kitchen_speed.active_orders_count.delivered}
            </Text>
            <Text style={styles.pulseChipLabel}>Entregues</Text>
          </View>
        </View>
      </View>

      {/* Grid de Métricas Financeiras Principais */}
      <View style={styles.metricsGrid}>
        {/* Faturamento Total */}
        <View style={styles.metricCard}>
          <View style={styles.metricTopLine}>
            <Text style={styles.metricLabel}>Faturamento Total</Text>
            <TrendingUp size={16} color={THEME.colors.success} />
          </View>
          <Text style={[styles.metricValue, { color: THEME.colors.success }]}>
            R$ {summary.total_revenue.toFixed(2)}
          </Text>
          <Text style={styles.metricSub}>{summary.total_orders} pedidos faturados</Text>
        </View>

        {/* Ticket Médio */}
        <View style={styles.metricCard}>
          <View style={styles.metricTopLine}>
            <Text style={styles.metricLabel}>Ticket Médio</Text>
            <ShoppingBag size={16} color={THEME.colors.textSecondary} />
          </View>
          <Text style={styles.metricValue}>R$ {summary.average_ticket.toFixed(2)}</Text>
          <Text style={styles.metricSub}>Média por cliente</Text>
        </View>

        {/* Hambúrgueres Vendidos */}
        <View style={styles.metricCard}>
          <View style={styles.metricTopLine}>
            <Text style={styles.metricLabel}>Burgers Montados</Text>
            <Utensils size={16} color={THEME.colors.primary} />
          </View>
          <Text style={[styles.metricValue, { color: THEME.colors.primary }]}>
            {summary.total_burgers_sold}
          </Text>
          <Text style={styles.metricSub}>Total de sanduíches</Text>
        </View>

        {/* Carnes / Blends na Chapa */}
        <View style={styles.metricCard}>
          <View style={styles.metricTopLine}>
            <Text style={styles.metricLabel}>Carnes Grelhadas</Text>
            <Flame size={16} color={THEME.colors.grillAmber} />
          </View>
          <Text style={[styles.metricValue, { color: THEME.colors.grillAmber }]}>
            {summary.total_patties_sold}
          </Text>
          <Text style={styles.metricSub}>{kitchen_speed.patties_per_hour} carnes / hora</Text>
        </View>
      </View>

      {/* Engenharia de Cardápio: Taxas de Conversão (Attach Rate) */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Conversão de Itens & Combos (Attach Rate)</Text>
        <Text style={styles.sectionSubtitle}>
          Índice de clientes que adicionam bebidas e acompanhamentos ao pedido
        </Text>

        <View style={styles.attachRatesRow}>
          {/* Taxa de Bebidas */}
          <View style={styles.attachCard}>
            <View style={styles.attachIconBox}>
              <Coffee size={20} color={THEME.colors.primary} />
            </View>
            <View style={styles.attachContent}>
              <View style={styles.attachTop}>
                <Text style={styles.attachLabel}>Bebidas / Refrigerantes</Text>
                <Text style={[styles.attachPercent, summary.drink_attach_rate >= 60 ? styles.percentGood : styles.percentWarning]}>
                  {summary.drink_attach_rate}%
                </Text>
              </View>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${summary.drink_attach_rate}%`,
                      backgroundColor: summary.drink_attach_rate >= 60 ? THEME.colors.success : THEME.colors.warning,
                    },
                  ]}
                />
              </View>
              <Text style={styles.attachTip}>
                {summary.drink_attach_rate >= 60 ? 'Excelente conversão de combo!' : 'Sugira bebida no fechamento no caixa'}
              </Text>
            </View>
          </View>

          {/* Taxa de Acompanhamentos / Batatas */}
          <View style={styles.attachCard}>
            <View style={styles.attachIconBox}>
              <Utensils size={20} color={THEME.colors.grillAmber} />
            </View>
            <View style={styles.attachContent}>
              <View style={styles.attachTop}>
                <Text style={styles.attachLabel}>Porções & Batatas</Text>
                <Text style={[styles.attachPercent, summary.side_attach_rate >= 40 ? styles.percentGood : styles.percentWarning]}>
                  {summary.side_attach_rate}%
                </Text>
              </View>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${summary.side_attach_rate}%`,
                      backgroundColor: summary.side_attach_rate >= 40 ? THEME.colors.success : THEME.colors.warning,
                    },
                  ]}
                />
              </View>
              <Text style={styles.attachTip}>
                {summary.side_attach_rate >= 40 ? 'Ótimo mix de porções adicionadas' : 'Ofereça batata como adicional'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Composição de Faturamento por Categoria */}
      {summary.category_breakdown.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Composição de Vendas por Categoria</Text>
          <Text style={styles.sectionSubtitle}>Participação de cada categoria no faturamento total</Text>

          <View style={styles.categoryList}>
            {summary.category_breakdown.map((cat) => (
              <View key={cat.category} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <Text style={styles.categoryName}>{cat.category_name}</Text>
                  <Text style={styles.categoryQty}>{cat.total_quantity} unidades vendidas</Text>
                </View>

                <View style={styles.categoryRight}>
                  <Text style={styles.categoryRevenue}>R$ {cat.total_revenue.toFixed(2)}</Text>
                  <View style={styles.categorySharePill}>
                    <Text style={styles.categoryShareText}>{cat.percentage_revenue}%</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Diagnósticos & Insights Inteligentes */}
      {summary.smart_insights.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Diagnósticos & Sugestões Práticas</Text>
          <Text style={styles.sectionSubtitle}>Análise automática para otimizar sua operação</Text>

          <View style={styles.insightsList}>
            {summary.smart_insights.map((insight) => (
              <View
                key={insight.id}
                style={[
                  styles.insightCard,
                  insight.type === 'highlight' && styles.insightCardHighlight,
                  insight.type === 'warning' && styles.insightCardWarning,
                  insight.type === 'success' && styles.insightCardSuccess,
                ]}
              >
                <View style={styles.insightHeader}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                </View>
                <Text style={styles.insightDesc}>{insight.description}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Horários de Pico */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Clock size={16} color={THEME.colors.textSecondary} />
          <Text style={styles.sectionTitle}>Distribuição por Horário (Pico)</Text>
        </View>
        {summary.peak_hours.length === 0 ? (
          <Text style={styles.emptyNotice}>Nenhum pedido registrado no período.</Text>
        ) : (
          <View style={styles.hoursContainer}>
            {summary.peak_hours.map((item) => {
              const barPercent = Math.min(100, Math.round((item.order_count / maxHourlyOrders) * 100));
              return (
                <View key={item.hour} style={styles.hourRow}>
                  <Text style={styles.hourLabel}>{String(item.hour).padStart(2, '0')}:00</Text>
                  <View style={styles.barBackground}>
                    <View style={[styles.barFill, { width: `${barPercent}%` }]} />
                  </View>
                  <View style={styles.hourNumbers}>
                    <Text style={styles.hourCount}>{item.order_count} ped.</Text>
                    <Text style={styles.hourRev}>R$ {item.revenue.toFixed(0)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Ranking dos Campeões de Venda */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Award size={16} color={THEME.colors.primary} />
          <Text style={styles.sectionTitle}>Ranking dos Campeões de Venda</Text>
        </View>
        {summary.top_products.length === 0 ? (
          <Text style={styles.emptyNotice}>Nenhum item vendido ainda.</Text>
        ) : (
          <View style={styles.topList}>
            {summary.top_products.map((item, index) => (
              <View key={item.product_id} style={styles.topItemRow}>
                <View
                  style={[
                    styles.rankPill,
                    index === 0 ? styles.rankGold : index === 1 ? styles.rankSilver : index === 2 ? styles.rankBronze : {},
                  ]}
                >
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.topItemInfo}>
                  <Text style={styles.topItemName}>{item.product_name}</Text>
                  <Text style={styles.topItemSub}>R$ {item.total_revenue.toFixed(2)} acumulados</Text>
                </View>
                <Text style={styles.topItemQty}>{item.quantity} un.</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.lg,
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    padding: 20,
  },
  loadingText: {
    color: THEME.colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
  },
  refreshBtnText: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  periodTabsRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    padding: 4,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
    marginBottom: THEME.spacing.md,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.md,
  },
  periodTabActive: {
    backgroundColor: THEME.colors.primary,
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  periodTabTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  pulseCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  pulseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  pulseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  pulseSpeedBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.warning,
  },
  pulseChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  pulseChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1.5,
  },
  pulseChipNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  pulseChipLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.lg,
  },
  metricCard: {
    width: '48%',
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
  },
  metricTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  metricSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.md,
    marginTop: 2,
  },
  emptyNotice: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    paddingVertical: 12,
    textAlign: 'center',
  },
  attachRatesRow: {
    gap: 12,
  },
  attachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    gap: 12,
  },
  attachIconBox: {
    width: 38,
    height: 38,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachContent: {
    flex: 1,
  },
  attachTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  attachLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  attachPercent: {
    fontSize: 14,
    fontWeight: '900',
  },
  percentGood: {
    color: THEME.colors.success,
  },
  percentWarning: {
    color: THEME.colors.warning,
  },
  attachTip: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  barBackground: {
    height: 6,
    backgroundColor: THEME.colors.surfaceBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  categoryList: {
    gap: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
  },
  categoryLeft: {
    flex: 1,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  categoryQty: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  categoryRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  categoryRevenue: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  categorySharePill: {
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryShareText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  insightsList: {
    gap: 10,
  },
  insightCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.textSecondary,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
  },
  insightCardHighlight: {
    borderLeftColor: THEME.colors.primary,
    backgroundColor: 'rgba(255, 179, 0, 0.04)',
  },
  insightCardWarning: {
    borderLeftColor: THEME.colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
  },
  insightCardSuccess: {
    borderLeftColor: THEME.colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  insightHeader: {
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  insightDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
  },
  hoursContainer: {
    gap: 10,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hourLabel: {
    width: 44,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  hourNumbers: {
    width: 90,
    alignItems: 'flex-end',
  },
  hourCount: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  hourRev: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  topList: {
    gap: 10,
  },
  topItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    gap: 10,
  },
  rankPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankGold: {
    backgroundColor: '#ffd700',
  },
  rankSilver: {
    backgroundColor: '#c0c0c0',
  },
  rankBronze: {
    backgroundColor: '#cd7f32',
  },
  rankText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  topItemInfo: {
    flex: 1,
  },
  topItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  topItemSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  topItemQty: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
});
