import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from './src/constants/theme';
import { APP_CONFIG } from './src/constants/config';
import { Header } from './src/components/Header';
import { PosScreen } from './src/screens/PosScreen';
import { KdsScreen } from './src/screens/KdsScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ConnectModal } from './src/components/ConnectModal';
import { ScannerModal } from './src/components/ScannerModal';
import { useConnection } from './src/hooks/useConnection';
import { useOrders } from './src/hooks/useOrders';
import { SupabaseSyncService } from './src/services/syncService';
import { UpdateService } from './src/services/updateService';
import { getDatabase } from './src/db/database';

export default function App() {
  // Prevenção de Suspensão de Tela ativa para operação contínua no food truck
  useKeepAwake();

  const [role, setRole] = useState<'pos' | 'kds' | 'dashboard'>('pos');
  const [connectModalVisible, setConnectModalVisible] = useState<boolean>(false);
  const [scannerModalVisible, setScannerModalVisible] = useState<boolean>(false);

  // Inicializar sincronização em nuvem, banco de dados e checagem de atualizações OTA
  useEffect(() => {
    getDatabase().catch(() => {});
    UpdateService.checkAndApplySilentUpdate().catch(() => {});
    const syncService = SupabaseSyncService.getInstance();
    syncService.start();

    // Carregar último papel salvo
    AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.APP_ROLE).then((saved) => {
      if (saved === 'pos' || saved === 'kds' || saved === 'dashboard') {
        setRole(saved);
      }
    });

    return () => {
      syncService.stop();
    };
  }, []);

  const handleSelectRole = (newRole: 'pos' | 'kds' | 'dashboard') => {
    setRole(newRole);
    AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.APP_ROLE, newRole).catch(() => {});
  };

  // Gerenciamento de Rede (Caixa / Cozinha)
  const connection = useConnection(role);

  // Gerenciamento de Pedidos e Eventos
  const {
    orders,
    readyNotification,
    createOrder,
    updateOrderStatus,
    deliverOrder,
    dismissNotification,
  } = useOrders({
    role,
    client: connection.client,
    server: connection.server,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor={THEME.colors.surface} />
      <View style={styles.container}>
        {/* Barra Superior de Identificação e Abas */}
        <Header
          role={role}
          onSelectRole={handleSelectRole}
          connectionStatus={connection.clientStatus}
          connectedClientsCount={connection.connectedClientsCount}
          onOpenConnectModal={() => setConnectModalVisible(true)}
          onOpenScannerModal={() => setScannerModalVisible(true)}
        />

        {/* Telas Operacionais */}
        <View style={styles.screenContent}>
          {role === 'pos' && (
            <PosScreen
              orders={orders}
              onCreateOrder={(name, items) => createOrder({ customer_name: name, items })}
              onDeliverOrder={deliverOrder}
              readyNotification={readyNotification}
              onDismissNotification={dismissNotification}
            />
          )}

          {role === 'kds' && (
            <KdsScreen
              orders={orders}
              connectionStatus={connection.clientStatus}
              onUpdateStatus={updateOrderStatus}
              onOpenScanner={() => setScannerModalVisible(true)}
            />
          )}

          {role === 'dashboard' && <DashboardScreen />}
        </View>

        {/* Modal de Conexão do Caixa (Exibe QR Code com IP Local) */}
        <ConnectModal
          visible={connectModalVisible}
          onClose={() => setConnectModalVisible(false)}
          localIp={connection.localIp}
          connectedClientsCount={connection.connectedClientsCount}
        />

        {/* Modal do Scanner da Cozinha (Câmera + Fallback de IP) */}
        <ScannerModal
          visible={scannerModalVisible}
          onClose={() => setScannerModalVisible(false)}
          onScanned={(payload) => {
            connection.connectToHost(payload);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  screenContent: {
    flex: 1,
  },
});
