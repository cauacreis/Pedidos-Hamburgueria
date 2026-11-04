import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Flame, CheckCircle2, Clock, Check } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { Order, OrderStatus } from '../types/database';
import { KdsService } from '../services/kdsService';

interface OrderCardProps {
  order: Order;
  mode: 'kds' | 'pos';
  onUpdateStatus?: (orderId: string, newStatus: OrderStatus) => void;
  onDeliverOrder?: (orderId: string) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  mode,
  onUpdateStatus,
  onDeliverOrder,
}) => {
  const waitMetrics = KdsService.calculateWaitMetrics(order);

  const getUrgencyBorderColor = () => {
    if (order.status === 'ready') return THEME.colors.success;
    if (waitMetrics.urgency === 'urgent') return THEME.colors.danger;
    if (waitMetrics.urgency === 'warning') return THEME.colors.warning;
    return THEME.colors.surfaceBorder;
  };

  const getUrgencyBadgeStyle = () => {
    if (order.status === 'ready') {
      return {
        backgroundColor: THEME.colors.successLight,
        color: THEME.colors.success,
        borderColor: THEME.colors.successBorder,
      };
    }
    if (waitMetrics.urgency === 'urgent') {
      return {
        backgroundColor: THEME.colors.dangerLight,
        color: THEME.colors.danger,
        borderColor: THEME.colors.dangerBorder,
      };
    }
    if (waitMetrics.urgency === 'warning') {
      return {
        backgroundColor: THEME.colors.warningLight,
        color: THEME.colors.warning,
        borderColor: THEME.colors.warningBorder,
      };
    }
    return {
      backgroundColor: THEME.colors.surfaceElevated,
      color: THEME.colors.textSecondary,
      borderColor: THEME.colors.surfaceBorderSubtle,
    };
  };

  const badgeStyle = getUrgencyBadgeStyle();

  return (
    <View style={[styles.card, { borderColor: getUrgencyBorderColor() }]}>
      {/* Header do Card: Senha, Cliente e Timer */}
      <View style={styles.header}>
        <View style={styles.numberContainer}>
          <View style={styles.dailyNumberPill}>
            <Text style={styles.dailyNumber}>#{String(order.daily_number).padStart(2, '0')}</Text>
          </View>
          <View style={styles.customerCol}>
            <Text style={styles.customerName} numberOfLines={1}>
              {order.customer_name || 'Balcão'}
            </Text>
            {mode === 'pos' && (
              <Text style={styles.orderCreatedAt}>
                {order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'item' : 'itens'}
              </Text>
            )}
          </View>
        </View>

        <View
          style={[
            styles.timerBadge,
            {
              backgroundColor: badgeStyle.backgroundColor,
              borderColor: badgeStyle.borderColor,
            },
          ]}
        >
          {order.status === 'ready' ? (
            <CheckCircle2 size={13} color={badgeStyle.color} style={styles.timerIcon} />
          ) : (
            <Clock size={13} color={badgeStyle.color} style={styles.timerIcon} />
          )}
          <Text style={[styles.timerText, { color: badgeStyle.color }]}>
            {order.status === 'ready' ? 'Pronto' : `${waitMetrics.minutesElapsed} min`}
          </Text>
        </View>
      </View>

      {/* Itens do Pedido */}
      <View style={styles.itemsList}>
        {(order.items || []).map((item, idx) => (
          <View key={item.id || idx} style={styles.itemRow}>
            <View style={styles.itemMain}>
              <View style={styles.qtyPill}>
                <Text style={styles.itemQty}>{item.quantity}x</Text>
              </View>
              <Text style={styles.itemName}>{item.product_name || 'Item'}</Text>
              {item.patty_count && item.patty_count > 0 ? (
                <View style={styles.pattyBadge}>
                  <Text style={styles.pattyBadgeText}>
                    {item.patty_count * item.quantity}x 🥩
                  </Text>
                </View>
              ) : null}
            </View>

            {item.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesIcon}>⚠️</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {/* Rodapé e Botões de Ação */}
      <View style={styles.footer}>
        {mode === 'kds' && (
          <View style={styles.kdsCardFooter}>
            {order.status === 'ready' ? (
              <View style={styles.kdsReadyBadge}>
                <CheckCircle2 size={15} color={THEME.colors.success} style={styles.btnIcon} />
                <Text style={styles.kdsReadyText}>Pronto no Balcão (Aguardando Retirada)</Text>
              </View>
            ) : (
              <View style={styles.kdsPrepBadge}>
                <Flame size={15} color={THEME.colors.grillAmber} style={styles.btnIcon} />
                <Text style={styles.kdsPrepText}>Na Fila para Preparo</Text>
              </View>
            )}
          </View>
        )}

        {mode === 'pos' && (
          <View style={styles.posFooter}>
            <View style={styles.statusPillContainer}>
              <View style={styles.posPriceRow}>
                <Text style={styles.posTotalPrefix}>R$</Text>
                <Text style={styles.posTotal}>{order.total.toFixed(2)}</Text>
              </View>

              <View
                style={[
                  styles.posStatusChip,
                  order.status === 'ready' && styles.posStatusReady,
                  order.status === 'preparing' && styles.posStatusPreparing,
                  order.status === 'queued' && styles.posStatusQueued,
                ]}
              >
                <Text
                  style={[
                    styles.posStatusText,
                    order.status === 'ready' && { color: THEME.colors.success },
                    order.status === 'preparing' && { color: THEME.colors.warning },
                    order.status === 'queued' && { color: THEME.colors.textMuted },
                    order.status === 'delivered' && { color: THEME.colors.info },
                  ]}
                >
                  {order.status === 'queued' && 'Na Fila'}
                  {order.status === 'preparing' && 'Na Chapa'}
                  {order.status === 'ready' && 'Pronto para Retirada'}
                  {order.status === 'delivered' && 'Entregue'}
                </Text>
              </View>
            </View>

            {/* O Balcão confirma quando fica pronto ou entrega */}
            {order.status === 'ready' ? (
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnDeliver]}
                onPress={() => onDeliverOrder && onDeliverOrder(order.id)}
                activeOpacity={0.8}
              >
                <Check size={16} color="#FFFFFF" style={styles.btnIcon} strokeWidth={3} />
                <Text style={styles.btnDeliverText}>Entregar Pedido</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnReadyPos]}
                onPress={() => onUpdateStatus && onUpdateStatus(order.id, 'ready')}
                activeOpacity={0.8}
              >
                <CheckCircle2 size={16} color="#FFFFFF" style={styles.btnIcon} />
                <Text style={styles.btnReadyPosText}>Marcar Pronto</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.lg,
    padding: 14,
    marginBottom: THEME.spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorderSubtle,
    paddingBottom: 10,
    marginBottom: 10,
  },
  numberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dailyNumberPill: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderHighlight,
    marginRight: 10,
  },
  dailyNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.primary,
    letterSpacing: 0.8,
  },
  customerCol: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  orderCreatedAt: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
  },
  timerIcon: {
    marginRight: 5,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  itemsList: {
    marginVertical: 4,
  },
  itemRow: {
    marginBottom: 8,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyPill: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
    marginRight: 8,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.primary,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  pattyBadge: {
    backgroundColor: 'rgba(226, 88, 34, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(226, 88, 34, 0.3)',
    marginLeft: 6,
  },
  pattyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.grillAmber,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 142, 38, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
    marginTop: 4,
    marginLeft: 32,
  },
  notesIcon: {
    marginRight: 5,
    fontSize: 12,
  },
  notesText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.warning,
  },
  footer: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorderSubtle,
  },
  kdsCardFooter: {
    paddingVertical: 4,
  },
  kdsPrepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    backgroundColor: 'rgba(226, 88, 34, 0.12)',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(226, 88, 34, 0.35)',
  },
  kdsPrepText: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.grillAmber,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  kdsReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    backgroundColor: THEME.colors.successLight,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.successBorder,
  },
  kdsReadyText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.success,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
  },
  btnIcon: {
    marginRight: 8,
  },
  btnReadyPos: {
    backgroundColor: THEME.colors.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: THEME.colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  btnReadyPosText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  btnDeliver: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnDeliverText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  posFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  posPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  posTotalPrefix: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    marginRight: 2,
  },
  posTotal: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  posStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  posStatusReady: {
    backgroundColor: THEME.colors.successLight,
    borderColor: THEME.colors.successBorder,
  },
  posStatusPreparing: {
    backgroundColor: THEME.colors.warningLight,
    borderColor: THEME.colors.warningBorder,
  },
  posStatusQueued: {
    backgroundColor: THEME.colors.surfaceElevated,
  },
  posStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
