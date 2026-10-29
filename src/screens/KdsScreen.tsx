import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { QrCode, ChefHat, Sparkles } from 'lucide-react-native';
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

  // Atualização periódica dos minutos de espera e cores de urgência em tempo real
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 15000); // 15 segundos

    return () => clearInterval(intervalId);
  }, []);

  if (isDisconnected) {
    return (
      <View style={styles.disconnectedContainer}>
        <View style={styles.disconnectedBox}>
          <View style={styles.logoRingWrapper}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.disconnectedLogo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.disconnectedTitle}>Cozinha da Bodega</Text>
          <Text style={styles.disconnectedSubtitle}>
            Conecte ao aparelho do Caixa para sincronizar pedidos e controlar a grelha em tempo real sem internet.
          </Text>

          <TouchableOpacity style={styles.scanBtn} onPress={onOpenScanner} activeOpacity={0.85}>
            <QrCode size={18} color="#FFFFFF" style={styles.scanBtnIcon} />
            <Text style={styles.scanBtnText}>Escanear QR do Caixa</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Módulo Superior: Controle de Chapa / Carnes */}
      <PattyCounter summary={pattySummary} />

      {/* Fila de Pedidos */}
      <ScrollView
        style={styles.ordersScroll}
        contentContainerStyle={styles.ordersContent}
        showsVerticalScrollIndicator={false}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <ChefHat size={36} color={THEME.colors.secondary} />
            </View>
            <View style={styles.emptyTitleRow}>
              <Text style={styles.emptyTitle}>Chapa Livre!</Text>
              <Sparkles size={18} color={THEME.colors.gold} />
            </View>
            <Text style={styles.emptySubtitle}>
              Nenhum pedido pendente na cozinha. Novos pedidos lançados no Caixa cairão aqui na hora.
            </Text>
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
    borderColor: THEME.colors.surfaceBorderHighlight,
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.xl,
    padding: 28,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  logoRingWrapper: {
    padding: 4,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: 'rgba(190, 56, 39, 0.15)',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
    marginBottom: 16,
  },
  disconnectedLogo: {
    width: 100,
    height: 100,
  },
  disconnectedTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  disconnectedSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    maxWidth: 300,
  },
  scanBtn: {
    backgroundColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: THEME.borderRadius.md,
    width: '100%',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  scanBtnIcon: {
    marginRight: 8,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ordersScroll: {
    flex: 1,
  },
  ordersContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderHighlight,
  },
  emptyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
