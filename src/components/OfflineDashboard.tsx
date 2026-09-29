import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { THEME } from '../constants/theme';
import { DailySummary } from '../types/database';
import { DashboardService } from '../services/dashboardService';

export const OfflineDashboard: React.FC = () => {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await DashboardService.getDailySummary();
      setSummary(data);
    } catch {
      // Ignora erro
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading || !summary) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Carregando métricas...</Text>
      </View>
    );
  }

  const maxHourlyOrders = Math.max(...summary.peak_hours.map((h) => h.order_count), 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Faturamento & Insights</Text>
          <Text style={styles.subtitle}>Resumo consolidado do turno</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchSummary}>
          <Text style={styles.refreshBtnText}>Atualizar</Text>
        </TouchableOpacity>
      </View>

      {/* Grid de Métricas Principais */}
      <View style={styles.metricsGrid}>
        {/* Faturamento Total */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Faturamento Total</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.success }]}>
            R$ {summary.total_revenue.toFixed(2)}
          </Text>
          <Text style={styles.metricSub}>{summary.total_orders} pedidos realizados</Text>
        </View>

        {/* Ticket Médio */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Ticket Médio</Text>
          <Text style={styles.metricValue}>R$ {summary.average_ticket.toFixed(2)}</Text>
          <Text style={styles.metricSub}>Por pedido no turno</Text>
        </View>

        {/* Hambúrgueres Vendidos */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Hambúrgueres Vendidos</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.primary }]}>
            {summary.total_burgers_sold}
          </Text>
          <Text style={styles.metricSub}>Sanduíches montados</Text>
        </View>

        {/* Carnes Grelhadas */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Carnes / Blends</Text>
          <Text style={[styles.metricValue, { color: THEME.colors.grillAmber }]}>
            {summary.total_patties_sold}
          </Text>
          <Text style={styles.metricSub}>Total de smash na chapa</Text>
        </View>
      </View>

      {/* Horários de Pico */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Horários de Pico (Volume de Pedidos)</Text>
        {summary.peak_hours.length === 0 ? (
          <Text style={styles.emptyNotice}>Nenhum pedido registrado hoje.</Text>
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
                  <Text style={styles.hourCount}>{item.order_count} ped.</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Itens Mais Vendidos */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Ranking dos Itens Mais Vendidos</Text>
        {summary.top_products.length === 0 ? (
          <Text style={styles.emptyNotice}>Nenhum item vendido ainda.</Text>
        ) : (
          <View style={styles.topList}>
            {summary.top_products.map((item, index) => (
              <View key={item.product_id} style={styles.topItemRow}>
                <View style={styles.rankPill}>
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
    marginBottom: THEME.spacing.lg,
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
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
  },
  refreshBtnText: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
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
  metricLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  metricSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.md,
  },
  emptyNotice: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  hoursContainer: {
    gap: 8,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hourLabel: {
    width: 44,
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  barBackground: {
    flex: 1,
    height: 14,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.sm,
  },
  hourCount: {
    width: 44,
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'right',
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
  },
  rankPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  topItemInfo: {
    flex: 1,
  },
  topItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  topItemSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  topItemQty: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
});
