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
  mode?: 'pos' | 'kds-hub';
  isNativeHubRunning?: boolean;
  isDiscovering?: boolean;
  onDiscoverHub?: () => void;
  onRefreshIp?: () => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  visible,
  onClose,
  localIp,
  connectedClientsCount,
  connectedHost,
  onConnectHost,
  onSwitchToScanner,
  mode = 'pos',
  isNativeHubRunning = false,
  isDiscovering = false,
  onDiscoverHub,
  onRefreshIp,
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

  const isKdsHubMode = mode === 'kds-hub';
  const isExpoGoPosMode = mode === 'pos' && !isNativeHubRunning;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.title}>
                {isKdsHubMode
                  ? 'Conectar o Caixa'
                  : isExpoGoPosMode
                  ? 'Conectar à Cozinha'
                  : 'Conectar Cozinha'}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>
              {isKdsHubMode
                ? 'No iPhone do Caixa, conecte no Wi-Fi deste celular e aponte a câmera para o código abaixo.'
                : isExpoGoPosMode
                ? 'Conecte no Wi-Fi do roteador da Cozinha e escaneie o código na tela dela.'
                : 'Abra a Cozinha no outro aparelho e aponte a câmera para o código abaixo.'}
            </Text>

            {isKdsHubMode && (
              <>
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

                <View style={styles.infoBox}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Endereço:</Text>
                    <Text style={styles.infoValue}>{localIp}:{APP_CONFIG.WEBSOCKET.DEFAULT_PORT}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        { color: connectedClientsCount > 0 ? THEME.colors.success : THEME.colors.gold },
                      ]}
                    >
                      {connectedClientsCount > 0 ? 'Caixa conectado' : 'Aguardando Caixa'}
                    </Text>
                  </View>
                </View>

                {onRefreshIp && (
                  <TouchableOpacity style={styles.hubBtn} onPress={onRefreshIp} activeOpacity={0.85}>
                    <Text style={styles.hubBtnText}>Atualizar endereço</Text>
                  </TouchableOpacity>
                )}

                {onSwitchToScanner && (
                  <TouchableOpacity
                    style={[styles.scannerBtn, { marginTop: 8, marginBottom: 14 }]}
                    onPress={onSwitchToScanner}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.scannerBtnText}>Conectar a outro aparelho</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {isExpoGoPosMode && (
              <>
                {onSwitchToScanner && (
                  <TouchableOpacity style={styles.primaryCtaBtn} onPress={onSwitchToScanner} activeOpacity={0.85}>
                    <Text style={styles.primaryCtaText}>Escanear QR da Cozinha</Text>
                  </TouchableOpacity>
                )}

                {onDiscoverHub && (
                  <TouchableOpacity
                    style={[styles.hubBtn, { marginBottom: 14 }, isDiscovering && { opacity: 0.65 }]}
                    onPress={onDiscoverHub}
                    disabled={isDiscovering}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.hubBtnText}>
                      {isDiscovering ? 'Buscando...' : 'Buscar Cozinha na Rede'}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.infoBox}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Cozinha:</Text>
                    <Text
                      style={[
                        styles.infoValue,
                        { color: connectedClientsCount > 0 ? THEME.colors.success : THEME.colors.gold },
                      ]}
                    >
                      {connectedClientsCount > 0 ? 'Conectada' : 'Aguardando conexão'}
                    </Text>
                  </View>

                  {connectedHost ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Endereço conectado:</Text>
                      <Text style={styles.infoValue}>{connectedHost}:{APP_CONFIG.WEBSOCKET.DEFAULT_PORT}</Text>
                    </View>
                  ) : null}
                </View>

                {onConnectHost && (
                  <View style={styles.hubSection}>
                    <Text style={styles.hubLabel}>Ou digite o endereço exibido na Cozinha:</Text>
                    <TextInput
                      style={styles.hubInput}
                      placeholder="Ex: 192.168.43.1"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={hubIpInput}
                      onChangeText={setHubIpInput}
                      keyboardType="numeric"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.scannerBtn} onPress={handleConnectHub} activeOpacity={0.85}>
                      <Text style={styles.scannerBtnText}>Conectar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {!isKdsHubMode && !isExpoGoPosMode && (
              <>
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

                {onRefreshIp && (
                  <TouchableOpacity
                    style={[styles.hubBtn, { marginBottom: 10 }]}
                    onPress={onRefreshIp}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.hubBtnText}>Atualizar endereço</Text>
                  </TouchableOpacity>
                )}

                {onConnectHost && (
                  <View style={styles.hubSection}>
                    <Text style={styles.hubLabel}>Ou conectar a outro endereço:</Text>
                    <TextInput
                      style={styles.hubInput}
                      placeholder="Ex: 192.168.43.1"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={hubIpInput}
                      onChangeText={setHubIpInput}
                      keyboardType="numeric"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.scannerBtn} onPress={handleConnectHub} activeOpacity={0.85}>
                      <Text style={styles.scannerBtnText}>Conectar</Text>
                    </TouchableOpacity>

                    {onSwitchToScanner && (
                      <TouchableOpacity style={styles.scannerBtn} onPress={onSwitchToScanner} activeOpacity={0.85}>
                        <Text style={styles.scannerBtnText}>Escanear QR</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
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
  primaryCtaBtn: {
    width: '100%',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 13,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryCtaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
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
