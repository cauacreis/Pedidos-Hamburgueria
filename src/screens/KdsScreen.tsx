import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, LayoutChangeEvent } from 'react-native';
import { QrCode, ChefHat, Sparkles, Flame, CheckCircle2, RefreshCw } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { THEME } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';
import { Order, OrderStatus } from '../types/database';
import { ConnectionStatus } from '../network/types';
import { NetworkDiscovery } from '../network/discovery';
import { PattyCounter } from '../components/PattyCounter';
import { OrderCard } from '../components/OrderCard';
import { usePattyCount } from '../hooks/usePattyCount';
import { KdsService } from '../services/kdsService';

interface KdsScreenProps {
  orders: Order[];
  connectionStatus: ConnectionStatus;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onOpenScanner: () => void;
  isNativeHubRunning?: boolean;
  connectedClientsCount?: number;
  localIp?: string;
  connectedHost?: string | null;
  onRefreshIp?: () => void;
}

export const KdsScreen: React.FC<KdsScreenProps> = ({
  orders,
  connectionStatus,
  onUpdateStatus,
  onOpenScanner,
  isNativeHubRunning = false,
  connectedClientsCount = 0,
  localIp = '192.168.43.1',
  connectedHost = null,
  onRefreshIp,
}) => {
  const pattySummary = usePattyCount(orders);
  const isDisconnected = connectionStatus === 'disconnected';

  const scrollViewRef = useRef<ScrollView | null>(null);
  const cardPositionsRef = useRef<Record<string, number>>({});
  const [viewportHeight, setViewportHeight] = useState<number>(0);
  const [contentHeight, setContentHeight] = useState<number>(0);
  const [layoutVersion, setLayoutVersion] = useState<number>(0);

  // Lista contínua: pedidos confirmados/entregues no topo e pendentes logo abaixo
  // Os pedidos nunca somem quando confirmados; a lista rola automaticamente para o primeiro pendente
  const sortedOrders = useMemo(() => KdsService.sortOrdersForAutoScroll(orders), [orders]);

  const pendingOrders = useMemo(
    () => sortedOrders.filter((o) => !KdsService.isOrderConfirmed(o)),
    [sortedOrders]
  );
  const confirmedOrders = useMemo(
    () => sortedOrders.filter((o) => KdsService.isOrderConfirmed(o)),
    [sortedOrders]
  );

  // Chave que representa mudanças de fila/status para disparar rolagem automática sem toque
  const queueSignature = useMemo(
    () => sortedOrders.map((o) => `${o.id}:${o.status}`).join('|'),
    [sortedOrders]
  );

  const scrollToActiveQueue = useCallback(() => {
    if (!scrollViewRef.current || viewportHeight <= 0 || contentHeight <= 0) return;

    const targetY = KdsService.calculateAutoScrollOffset(
      sortedOrders,
      cardPositionsRef.current,
      contentHeight,
      viewportHeight
    );

    scrollViewRef.current.scrollTo({ y: targetY, animated: true });
  }, [sortedOrders, contentHeight, viewportHeight]);

  // Rola automaticamente sempre que um pedido for confirmado no Balcão, novo pedido chegar ou layout mudar
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToActiveQueue();
    }, 60);
    return () => clearTimeout(timer);
  }, [queueSignature, layoutVersion, contentHeight, viewportHeight, scrollToActiveQueue]);

  // Atualização periódica dos minutos de espera e cores de urgência em tempo real
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const intervalId = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 15000); // 15 segundos

    return () => clearInterval(intervalId);
  }, []);

  const handleCardLayout = (orderId: string, event: LayoutChangeEvent) => {
    const y = event.nativeEvent.layout.y;
    if (cardPositionsRef.current[orderId] !== y) {
      cardPositionsRef.current[orderId] = y;
      setLayoutVersion((v) => v + 1);
    }
  };

  const showingSelfHubWaitingQr =
    isNativeHubRunning &&
    connectedClientsCount === 0 &&
    sortedOrders.length === 0 &&
    (!connectedHost || connectedHost.includes('127.0.0.1'));

  if (showingSelfHubWaitingQr) {
    const qrPayload = NetworkDiscovery.generatePairingPayload(
      localIp,
      APP_CONFIG.WEBSOCKET.DEFAULT_PORT
    );
    return (
      <View style={styles.disconnectedContainer}>
        <View style={styles.disconnectedBox}>
          <Text style={styles.disconnectedTitle}>Cozinha Pronta</Text>
          <Text style={styles.hubSubtitle}>
            Ligue o roteador do celular e conecte o iPhone do Caixa nessa rede. Se não conectar sozinho, aponte a câmera do Caixa para o código abaixo:
          </Text>

          <View style={styles.hubQrBox}>
            <QRCode
              value={qrPayload}
              size={180}
              color={THEME.colors.background}
              backgroundColor="#FFFFFF"
              logo={require('../../assets/logo_icon.png')}
              logoSize={40}
              logoBackgroundColor="#FFFFFF"
              logoMargin={2}
              logoBorderRadius={20}
            />
          </View>

          <View style={styles.hubIpBadge}>
            <Text style={styles.hubIpLabel}>Endereço desta tela:</Text>
            <Text style={styles.hubIpValue}>
              {localIp}:{APP_CONFIG.WEBSOCKET.DEFAULT_PORT}
            </Text>
          </View>

          {onRefreshIp && (
            <TouchableOpacity style={styles.refreshIpBtn} onPress={onRefreshIp} activeOpacity={0.85}>
              <RefreshCw size={15} color={THEME.colors.textPrimary} style={styles.scanBtnIcon} />
              <Text style={styles.refreshIpText}>Atualizar endereço</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (isDisconnected && sortedOrders.length === 0) {
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

      {/* Painel de Status Contínuo (Sem necessidade de toque pelo cozinheiro) */}
      <View style={styles.kdsTabsWrapper}>
        <View style={styles.kdsTabs}>
          <TouchableOpacity
            style={[styles.kdsTab, styles.kdsTabActive]}
            onPress={scrollToActiveQueue}
            activeOpacity={0.8}
          >
            <Flame size={15} color="#FFFFFF" style={styles.tabIcon} />
            <Text style={[styles.kdsTabText, styles.kdsTabTextActive]}>
              Na Fila ({pendingOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kdsTab, confirmedOrders.length > 0 && styles.kdsTabDoneIndicator]}
            onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
            activeOpacity={0.8}
          >
            <CheckCircle2
              size={15}
              color={confirmedOrders.length > 0 ? THEME.colors.success : THEME.colors.textSecondary}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.kdsTabText,
                confirmedOrders.length > 0 && { color: THEME.colors.success, fontWeight: '800' },
              ]}
            >
              Entregues ({confirmedOrders.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista Única de Pedidos com Rolagem Automática */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.ordersScroll}
        contentContainerStyle={styles.ordersContent}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentHeight(h)}
      >
        {sortedOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <ChefHat size={36} color={THEME.colors.secondary} />
            </View>
            <View style={styles.emptyTitleRow}>
              <Text style={styles.emptyTitle}>Chapa Livre!</Text>
              <Sparkles size={18} color={THEME.colors.gold} />
            </View>
            <Text style={styles.emptySubtitle}>
              Nenhum pedido na cozinha no momento. Novos pedidos lançados no Caixa cairão aqui na hora.
            </Text>
          </View>
        ) : (
          sortedOrders.map((order) => (
            <View key={order.id} onLayout={(e) => handleCardLayout(order.id, e)}>
              <OrderCard
                order={order}
                mode="kds"
                onUpdateStatus={onUpdateStatus}
              />
            </View>
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
  hubSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    maxWidth: 310,
  },
  hubQrBox: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    marginBottom: 16,
  },
  hubIpBadge: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorder,
  },
  hubIpLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  hubIpValue: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    fontWeight: '800',
  },
  refreshIpBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.surfaceBorderHighlight,
    borderWidth: 1,
    paddingVertical: 11,
    borderRadius: THEME.borderRadius.md,
  },
  refreshIpText: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  kdsTabsWrapper: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
  },
  kdsTabs: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  kdsTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  kdsTabActive: {
    backgroundColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 2,
  },
  kdsTabReadyActive: {
    backgroundColor: THEME.colors.success,
    shadowColor: THEME.colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 2,
  },
  kdsTabDoneIndicator: {
    backgroundColor: THEME.colors.successLight,
    borderWidth: 1,
    borderColor: THEME.colors.successBorder,
  },
  tabIcon: {
    marginRight: 6,
  },
  kdsTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  kdsTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
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
