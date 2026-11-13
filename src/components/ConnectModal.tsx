import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { THEME } from '../constants/theme';
import { NetworkDiscovery } from '../network/discovery';
import { APP_CONFIG } from '../constants/config';

interface ConnectModalProps {
  visible: boolean;
  onClose: () => void;
  localIp: string;
  connectedClientsCount: number;
  connectedHost?: string | null;
  onConnectHost?: (host: string) => void;
  onSwitchToScanner?: () => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  visible,
  onClose,
  localIp,
  connectedClientsCount,
  connectedHost,
  onConnectHost,
  onSwitchToScanner,
}) => {
  const [hubIpInput, setHubIpInput] = useState<string>(connectedHost || '192.168.43.1');

  useEffect(() => {
    if (visible) {
      setHubIpInput(connectedHost || '192.168.43.1');
    }
  }, [visible, connectedHost]);

  const qrPayload = NetworkDiscovery.generatePairingPayload(
    localIp,
    APP_CONFIG.WEBSOCKET.DEFAULT_PORT
  );

  const handleConnectHub = () => {
    if (onConnectHost && hubIpInput.trim()) {
      onConnectHost(hubIpInput.trim());
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.title}>Conectar Cozinha (KDS)</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>
              Abra a tela da Cozinha no outro celular e aponte a câmera ou conecte pelo roteador local sem internet.
            </Text>

            {/* QR Code Container */}
            <View style={styles.qrContainer}>
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

            {/* Informações da Conexão Local */}
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Endereço Local:</Text>
                <Text style={styles.infoValue}>{localIp}:{APP_CONFIG.WEBSOCKET.DEFAULT_PORT}</Text>
              </View>

              {connectedHost ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Roteador/Hub:</Text>
                  <Text style={styles.infoValue}>{connectedHost}:{APP_CONFIG.WEBSOCKET.DEFAULT_PORT}</Text>
                </View>
              ) : null}

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cozinhas Conectadas:</Text>
                <Text style={[styles.infoValue, { color: THEME.colors.success }]}>
                  {connectedClientsCount} dispositivo(s)
                </Text>
              </View>
            </View>

            {/* Conexão pelo Roteador / Hotspot Local */}
            {onConnectHost && (
              <View style={styles.hubSection}>
                <Text style={styles.hubLabel}>IP do Roteador/Android (sem internet):</Text>
                <TextInput
                  style={styles.hubInput}
                  placeholder="Ex: 192.168.43.1"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={hubIpInput}
                  onChangeText={setHubIpInput}
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.hubBtn} onPress={handleConnectHub} activeOpacity={0.85}>
                  <Text style={styles.hubBtnText}>Conectar ao Roteador/Hub</Text>
                </TouchableOpacity>

                {onSwitchToScanner && (
                  <TouchableOpacity style={styles.scannerBtn} onPress={onSwitchToScanner} activeOpacity={0.85}>
                    <Text style={styles.scannerBtnText}>Escanear QR da Cozinha</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Botão Fechar */}
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Fechar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '90%',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  scrollContent: {
    alignItems: 'center',
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    fontSize: 18,
    color: THEME.colors.textMuted,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
    lineHeight: 18,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  infoBox: {
    width: '100%',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: THEME.spacing.lg,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    fontWeight: '700',
  },
  hubSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
    paddingTop: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    gap: 8,
  },
  hubLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  hubInput: {
    width: '100%',
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: THEME.colors.textPrimary,
    fontSize: 14,
  },
  hubBtn: {
    width: '100%',
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.primary,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  hubBtnText: {
    color: THEME.colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  scannerBtn: {
    width: '100%',
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  scannerBtnText: {
    color: THEME.colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    textTransform: 'uppercase',
  },
});
