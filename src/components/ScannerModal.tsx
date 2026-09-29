import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { THEME } from '../constants/theme';
import { NetworkDiscovery } from '../network/discovery';

interface ScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (payload: string) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ visible, onClose, onScanned }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [manualIp, setManualIp] = useState('');
  const [scanned, setScanned] = useState(false);

  // Resetar o estado de leitura sempre que o modal for reaberto
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setManualIp('');
    }
  }, [visible]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    const parsed = NetworkDiscovery.parsePairingPayload(data);
    if (parsed) {
      onScanned(data);
      onClose();
    } else {
      // Reativa leitura após 2 segundos se inválido
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const handleManualSubmit = () => {
    if (!manualIp.trim()) return;
    onScanned(manualIp.trim());
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Escanear QR do Caixa</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Câmera ou Pedido de Permissão */}
          <View style={styles.cameraFrame}>
            {!permission?.granted ? (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionText}>
                  Precisamos de acesso à câmera para ler o QR Code do Caixa.
                </Text>
                <TouchableOpacity
                  style={styles.permissionBtn}
                  onPress={requestPermission}
                  activeOpacity={0.8}
                >
                  <Text style={styles.permissionBtnText}>Conceder Permissão</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              />
            )}
          </View>

          {/* Fallback de IP Manual */}
          <View style={styles.manualSection}>
            <Text style={styles.manualLabel}>Ou digite o IP do Caixa manualmente:</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Ex: 192.168.43.1"
                placeholderTextColor={THEME.colors.textMuted}
                value={manualIp}
                onChangeText={setManualIp}
                keyboardType="numeric"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.connectBtn}
                onPress={handleManualSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.connectBtnText}>Conectar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.lg,
    borderWidth: 1.5,
    borderColor: THEME.colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
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
  cameraFrame: {
    width: '100%',
    height: 250,
    borderRadius: THEME.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },
  permissionBox: {
    padding: THEME.spacing.lg,
    alignItems: 'center',
  },
  permissionText: {
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  manualSection: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.surfaceBorder,
    paddingTop: THEME.spacing.md,
  },
  manualLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 8,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: THEME.colors.textPrimary,
    fontSize: 14,
  },
  connectBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    borderRadius: THEME.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
