import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../constants/theme';
import { ConnectionStatus } from '../network/types';

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
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>BURGER POS</Text>
          <Text style={styles.brandSubtitle}>Food Truck Local-First</Text>
        </View>

        {/* Indicador de Conexão */}
        <View style={styles.statusSection}>
          {role === 'pos' && (
            <TouchableOpacity
              style={[
                styles.connectionBadge,
                connectedClientsCount > 0 ? styles.badgeConnected : styles.badgeWarning,
              ]}
              onPress={onOpenConnectModal}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      connectedClientsCount > 0 ? THEME.colors.success : THEME.colors.warning,
                  },
                ]}
              />
              <Text style={styles.connectionText}>
                {connectedClientsCount > 0
                  ? `${connectedClientsCount} Cozinha conectada`
                  : 'Conectar Cozinha'}
              </Text>
            </TouchableOpacity>
          )}

          {role === 'kds' && (
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
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      connectionStatus === 'connected'
                        ? THEME.colors.success
                        : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
                        ? THEME.colors.warning
                        : THEME.colors.danger,
                  },
                ]}
              />
              <Text style={styles.connectionText}>
                {connectionStatus === 'connected'
                  ? 'Conectado ao Caixa'
                  : connectionStatus === 'reconnecting' || connectionStatus === 'connecting'
                  ? 'Reconectando...'
                  : 'Desconectado (Escanear)'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Role Switcher */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, role === 'pos' && styles.tabButtonActive]}
          onPress={() => onSelectRole('pos')}
        >
          <Text style={[styles.tabText, role === 'pos' && styles.tabTextActive]}>Frente de Caixa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, role === 'kds' && styles.tabButtonActive]}
          onPress={() => onSelectRole('kds')}
        >
          <Text style={[styles.tabText, role === 'kds' && styles.tabTextActive]}>Cozinha / KDS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, role === 'dashboard' && styles.tabButtonActive]}
          onPress={() => onSelectRole('dashboard')}
        >
          <Text style={[styles.tabText, role === 'dashboard' && styles.tabTextActive]}>Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.surface,
    paddingTop: 45,
    paddingBottom: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.surfaceBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  brandContainer: {
    flexDirection: 'column',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: THEME.colors.primary,
  },
  brandSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
    marginTop: -2,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
  },
  badgeConnected: {
    backgroundColor: THEME.colors.successLight,
    borderColor: THEME.colors.success,
  },
  badgeDisconnected: {
    backgroundColor: THEME.colors.dangerLight,
    borderColor: THEME.colors.danger,
  },
  badgeWarning: {
    backgroundColor: THEME.colors.warningLight,
    borderColor: THEME.colors.warning,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.primary,
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
