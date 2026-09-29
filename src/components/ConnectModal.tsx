import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { THEME } from '../constants/theme';
import { NetworkDiscovery } from '../network/discovery';
import { APP_CONFIG } from '../constants/config';

interface ConnectModalProps {
  visible: boolean;
  onClose: () => void;
  localIp: string;
  connectedClientsCount: number;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  visible,
  onClose,
  localIp,
  connectedClientsCount,
}) => {
  const qrPayload = NetworkDiscovery.generatePairingPayload(
    localIp,
    APP_CONFIG.WEBSOCKET.DEFAULT_PORT
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.title}>Conectar Cozinha (KDS)</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            Abra a tela da Cozinha no outro celular e aponte a câmera para parear instantaneamente.
          </Text>

          {/* QR Code Container */}
          <View style={styles.qrContainer}>
            <QRCode
              value={qrPayload}
              size={210}
              color="#0B0D11"
              backgroundColor="#FFFFFF"
            />
          </View>

          {/* Informações Técnicas Amigáveis */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Endereço Local:</Text>
              <Text style={styles.infoValue}>{localIp}:{APP_CONFIG.WEBSOCKET.DEFAULT_PORT}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cozinhas Conectadas:</Text>
              <Text style={[styles.infoValue, { color: THEME.colors.success }]}>
                {connectedClientsCount} dispositivo(s)
              </Text>
            </View>
          </View>

          {/* Botão Fechar */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Fechar</Text>
          </TouchableOpacity>
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
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1.5,
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
