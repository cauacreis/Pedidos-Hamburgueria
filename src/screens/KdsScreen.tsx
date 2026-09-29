import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';
import { Order, OrderStatus } from '../types/database';
import { ConnectionStatus } from '../network/types';
import { PattyCounter } from '../components/PattyCounter';
import { OrderCard } from '../components/OrderCard';
import { usePattyCount } from '../hooks/usePattyCount';

interface KdsScreenProps {
  orders: Order[];
  connectionStatus: ConnectionStatus;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onOpenScanner: () => void;
}

export const KdsScreen: React.FC<KdsScreenProps> = ({
  orders,
  connectionStatus,
  onUpdateStatus,
  onOpenScanner,
}) => {
  const pattySummary = usePattyCount(orders);
  const isDisconnected = connectionStatus === 'disconnected';

  if (isDisconnected) {
    return (
      <View style={styles.disconnectedContainer}>
        <View style={styles.disconnectedBox}>
          <View style={styles.disconnectIconCircle}>
            <Text style={styles.disconnectIconText}>📡</Text>
          </View>

          <Text style={styles.disconnectedTitle}>Cozinha Desconectada</Text>
          <Text style={styles.disconnectedSubtitle}>
            Conecte ao aparelho do Caixa para receber pedidos e acompanhar a fila de preparo em tempo real.
          </Text>

          <TouchableOpacity style={styles.scanBtn} onPress={onOpenScanner} activeOpacity={0.85}>
            <Text style={styles.scanBtnText}>Escanear QR do Caixa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Módulo Superior Obrigatório: Controle de Chapa / Carnes */}
      <PattyCounter summary={pattySummary} />

      {/* Fila de Pedidos */}
      <ScrollView style={styles.ordersScroll} contentContainerStyle={styles.ordersContent}>
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Chapa Livre! 🔥</Text>
            <Text style={styles.emptySubtitle}>Nenhum pedido pendente na cozinha no momento.</Text>
          </View>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              mode="kds"
              onUpdateStatus={onUpdateStatus}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  disconnectedContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  disconnectedBox: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xxl,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
  },
  disconnectIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  disconnectIconText: {
    fontSize: 28,
  },
  disconnectedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  disconnectedSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  scanBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: THEME.borderRadius.md,
    width: '100%',
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ordersScroll: {
    flex: 1,
  },
  ordersContent: {
    padding: THEME.spacing.lg,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
});
