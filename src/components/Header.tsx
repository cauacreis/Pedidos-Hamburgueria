import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, StatusBar as RNStatusBar } from 'react-native';
import { ShoppingBag, ChefHat, TrendingUp, QrCode, Wifi, WifiOff } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { ConnectionStatus } from '../network/types';

const STATUS_BAR_CLEARANCE = Platform.OS === 'android' ? Math.max(RNStatusBar.currentHeight || 0, 34) + 12 : 12;

interface HeaderProps {
  role: 'pos' | 'kds' | 'dashboard';
  onSelectRole: (role: 'pos' | 'kds' | 'dashboard') => void;
  connectionStatus?: ConnectionStatus;
  connectedClientsCount?: number;
  onOpenConnectModal?: () => void;
  onOpenScannerModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  onSelectRole,
  connectionStatus = 'disconnected',
  connectedClientsCount = 0,
  onOpenConnectModal,
  onOpenScannerModal,
}) => {
  const isPos = role === 'pos';
  const isKds = role === 'kds';
  const isDashboard = role === 'dashboard';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={styles.logoRing}>
            <Image
              source={require('../../assets/logo_icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.brandTextCol}>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitle}>BODEGA DO VIDIGAL</Text>
            </View>
            <View style={styles.brandTag}>
              <Text style={styles.brandSubtitle}>HAMBURGUERIA ARTESANAL</Text>
            </View>
          </View>
        </View>

        {/* Indicador de Conexão com Feedback Visual */}
        <View style={styles.statusSection}>
          {isPos && (
            <TouchableOpacity
              style={[
                styles.connectionBadge,
                connectedClientsCount > 0 ? styles.badgeConnected : styles.badgeWarning,
              ]}
              onPress={onOpenConnectModal}
              activeOpacity={0.8}
            >
              {connectedClientsCount > 0 ? (
                <Wifi size={13} color={THEME.colors.success} style={styles.badgeIcon} />
              ) : (
                <QrCode size={13} color={THEME.colors.gold} style={styles.badgeIcon} />
              )}
              <Text
                style={[
                  styles.connectionText,
                  connectedClientsCount > 0
                    ? { color: THEME.colors.textPrimary }
                    : { color: THEME.colors.gold },
                ]}
              >
                {connectedClientsCount > 0
                  ? `${connectedClientsCount} Cozinha conectada`
                  : 'Conectar Cozinha'}
              </Text>
            </TouchableOpacity>
          )}

          {isKds && (
            <TouchableOpacity
              style={[
                styles.connectionBadge,
                connectionStatus === 'connected'
                  ? styles.badgeConnected
                  : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
                  ? styles.badgeWarning
                  : styles.badgeDisconnected,
              ]}
              onPress={connectionStatus !== 'connected' ? onOpenScannerModal : undefined}
              activeOpacity={0.8}
            >
              {connectionStatus === 'connected' ? (
                <Wifi size={13} color={THEME.colors.success} style={styles.badgeIcon} />
              ) : (
                <WifiOff size={13} color={THEME.colors.danger} style={styles.badgeIcon} />
              )}
              <Text style={styles.connectionText}>
                {connectionStatus === 'connected'
                  ? 'Conectado ao Caixa'
                  : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
                  ? 'Reconectando...'
                  : 'Escanear QR do Caixa'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Role Switcher - Cápsula Tátil de Navegação */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, isPos && styles.tabButtonActive]}
            onPress={() => onSelectRole('pos')}
            activeOpacity={0.8}
          >
            <ShoppingBag
              size={15}
              color={isPos ? '#FFFFFF' : THEME.colors.textSecondary}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, isPos && styles.tabTextActive]}>Frente de Caixa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, isKds && styles.tabButtonActive]}
            onPress={() => onSelectRole('kds')}
            activeOpacity={0.8}
          >
            <ChefHat
              size={15}
              color={isKds ? '#FFFFFF' : THEME.colors.textSecondary}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, isKds && styles.tabTextActive]}>Cozinha / KDS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, isDashboard && styles.tabButtonActive]}
            onPress={() => onSelectRole('dashboard')}
            activeOpacity={0.8}
          >
            <TrendingUp
              size={15}
              color={isDashboard ? '#FFFFFF' : THEME.colors.textSecondary}
              style={styles.tabIcon}
            />
            <Text style={[styles.tabText, isDashboard && styles.tabTextActive]}>Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.surface,
    paddingTop: STATUS_BAR_CLEARANCE,
    paddingBottom: 10,
    paddingHorizontal: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoRing: {
    padding: 2,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: 'rgba(190, 56, 39, 0.2)',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: THEME.colors.textPrimary,
  },
  brandTag: {
    marginTop: 2,
  },
  brandSubtitle: {
    fontSize: 10,
    color: THEME.colors.secondary,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
  },
  badgeConnected: {
    backgroundColor: THEME.colors.successLight,
    borderColor: THEME.colors.successBorder,
  },
  badgeDisconnected: {
    backgroundColor: THEME.colors.dangerLight,
    borderColor: THEME.colors.dangerBorder,
  },
  badgeWarning: {
    backgroundColor: THEME.colors.goldLight,
    borderColor: THEME.colors.goldBorder,
  },
  badgeIcon: {
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  tabsWrapper: {
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
