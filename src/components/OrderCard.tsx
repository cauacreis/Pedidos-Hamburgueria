import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
      return { backgroundColor: THEME.colors.successLight, color: THEME.colors.success };
    }
    if (waitMetrics.urgency === 'urgent') {
      return { backgroundColor: THEME.colors.dangerLight, color: THEME.colors.danger };
    }
    if (waitMetrics.urgency === 'warning') {
      return { backgroundColor: THEME.colors.warningLight, color: THEME.colors.warning };
    }
    return { backgroundColor: THEME.colors.surfaceHighlight, color: THEME.colors.textSecondary };
  };

  const badgeStyle = getUrgencyBadgeStyle();

  return (
    <View style={[styles.card, { borderColor: getUrgencyBorderColor() }]}>
      {/* Header do Card: Senha, Cliente e Timer */}
      <View style={styles.header}>
        <View style={styles.numberContainer}>
          <Text style={styles.dailyNumber}>#{String(order.daily_number).padStart(2, '0')}</Text>
          <Text style={styles.customerName} numberOfLines={1}>
            {order.customer_name}
          </Text>
        </View>

        <View style={[styles.timerBadge, { backgroundColor: badgeStyle.backgroundColor }]}>
          <Text style={[styles.timerText, { color: badgeStyle.color }]}>
            {order.status === 'ready'
              ? 'Pronto'
              : `${waitMetrics.minutesElapsed} min`}
          </Text>
        </View>
      </View>

      {/* Itens do Pedido */}
      <View style={styles.itemsList}>
        {(order.items || []).map((item, idx) => (
          <View key={item.id || idx} style={styles.itemRow}>
            <View style={styles.itemMain}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
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
                <Text style={styles.notesText}>⚠️ {item.notes}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {/* Rodapé e Botões de Ação */}
      <View style={styles.footer}>
        {mode === 'kds' && (
          <>
            {order.status === 'queued' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnStart]}
                onPress={() => onUpdateStatus && onUpdateStatus(order.id, 'preparing')}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>Iniciar Preparo</Text>
              </TouchableOpacity>
            )}

            {order.status === 'preparing' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnReady]}
                onPress={() => onUpdateStatus && onUpdateStatus(order.id, 'ready')}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>Marcar como Pronto</Text>
              </TouchableOpacity>
            )}

            {order.status === 'ready' && (
              <View style={styles.readyTag}>
                <Text style={styles.readyTagText}>Aguardando Entrega</Text>
              </View>
            )}
          </>
        )}

        {mode === 'pos' && (
          <View style={styles.posFooter}>
            <View style={styles.statusPillContainer}>
              <Text style={styles.posTotal}>R$ {order.total.toFixed(2)}</Text>
              <Text
                style={[
                  styles.posStatusBadge,
                  order.status === 'ready' && { color: THEME.colors.success },
                  order.status === 'preparing' && { color: THEME.colors.warning },
                  order.status === 'queued' && { color: THEME.colors.textMuted },
                  order.status === 'delivered' && { color: THEME.colors.info },
                ]}
              >
                {order.status === 'queued' && 'Na fila'}
                {order.status === 'preparing' && 'Na chapa'}
                {order.status === 'ready' && 'Pronto!'}
                {order.status === 'delivered' && 'Entregue'}
              </Text>
            </View>

            {order.status === 'ready' && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnDeliver]}
                onPress={() => onDeliverOrder && onDeliverOrder(order.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnText}>Entregar Pedido</Text>
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
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
    paddingBottom: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  numberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dailyNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginRight: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  timerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
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
  itemQty: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.primary,
    width: 28,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  pattyBadge: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
    marginLeft: 6,
  },
  pattyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.grillAmber,
  },
  notesBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: THEME.borderRadius.sm,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 4,
    marginLeft: 28,
    alignSelf: 'flex-start',
  },
  notesText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.warning,
  },
  footer: {
    marginTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
    paddingTop: THEME.spacing.sm,
  },
  actionBtn: {
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnStart: {
    backgroundColor: THEME.colors.primary,
  },
  btnReady: {
    backgroundColor: THEME.colors.success,
  },
  btnDeliver: {
    backgroundColor: THEME.colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  readyTag: {
    backgroundColor: THEME.colors.successLight,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  readyTagText: {
    color: THEME.colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  posFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPillContainer: {
    flexDirection: 'column',
  },
  posTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  posStatusBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
