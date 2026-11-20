import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { PosWebSocketServer } from '../network/server';
import { KdsWebSocketClient } from '../network/client';
import { ConnectionStatus, ServerStatus } from '../network/types';
import { NetworkDiscovery } from '../network/discovery';
import { LocalHub } from '../network/localHub';
import { APP_CONFIG } from '../constants/config';

export function useConnection(role: 'pos' | 'kds' | 'dashboard') {
  // Estado do Caixa / Hub
  const [localIp, setLocalIp] = useState<string>('192.168.43.1');
  const [serverStatus, setServerStatus] = useState<ServerStatus>('idle');
  const [connectedClientsCount, setConnectedClientsCount] = useState<number>(0);
  const [isNativeHubRunning, setIsNativeHubRunning] = useState<boolean>(false);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);

  // Estado da Cozinha (Cliente)
  const [clientStatus, setClientStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedHost, setConnectedHost] = useState<string | null>(null);

  // Instâncias ativas em estado reativo para propagação limpa aos hooks
  const [client, setClient] = useState<KdsWebSocketClient | null>(null);
  const [server, setServer] = useState<PosWebSocketServer | null>(null);

  const clientRef = useRef<KdsWebSocketClient | null>(null);
  const serverRef = useRef<PosWebSocketServer | null>(null);

  const refreshLocalIp = useCallback(async () => {
    const ip = await NetworkDiscovery.getLocalIpAddress();
    setLocalIp(ip);
    return ip;
  }, []);

  // Inicialização para Caixa (mantém servidor/ponte ativo mesmo se alternar temporariamente para o Dashboard)
  useEffect(() => {
    if (role === 'pos' || role === 'dashboard') {
      const srv = PosWebSocketServer.getInstance(APP_CONFIG.WEBSOCKET.DEFAULT_PORT);
      serverRef.current = srv;
      setServer(srv);

      void refreshLocalIp();

      srv.start().then(() => {
        setServerStatus(srv.getStatus());
        setConnectedHost(srv.getHubHost());
        if (LocalHub.isAvailable()) {
          setIsNativeHubRunning(LocalHub.isRunning());
        }
      });

      const unsubCount = srv.onClientCountChange((count) => {
        setConnectedClientsCount(count);
      });

      return () => {
        unsubCount();
      };
    }
  }, [role, refreshLocalIp]);

  // Inicialização para Cozinha
  useEffect(() => {
    if (role === 'kds') {
      let cancelled = false;
      const cli = new KdsWebSocketClient();
      clientRef.current = cli;
      setClient(cli);

      const unsubStatus = cli.onStatusChange((status) => {
        setClientStatus(status);
        if (status === 'connected') {
          setConnectedHost(cli.getUrl());
        }
      });

      const unsubPeerCount = cli.onPeerCountChange((count) => {
        setConnectedClientsCount(count);
      });

      if (LocalHub.isAvailable()) {
        (async () => {
          const started = await LocalHub.startServer(APP_CONFIG.WEBSOCKET.DEFAULT_PORT);
          if (cancelled) return;
          setIsNativeHubRunning(started || LocalHub.isRunning());
          await refreshLocalIp();
          if (cancelled) return;
          await cli.connect('127.0.0.1', APP_CONFIG.WEBSOCKET.DEFAULT_PORT);
        })();
      } else {
        setIsNativeHubRunning(false);
        // Tentar reconectar automaticamente com último IP gravado
        cli.connectLastSaved();
      }

      return () => {
        cancelled = true;
        unsubStatus();
        unsubPeerCount();
        cli.disconnect();
      };
    }
  }, [role, refreshLocalIp]);

  // Atualiza IP local periodicamente na Cozinha enquanto aguarda o Caixa conectar
  // (garante que o QR Code mude automaticamente se o roteador for ligado após abrir o app)
  useEffect(() => {
    if (role !== 'kds' || !isNativeHubRunning || connectedClientsCount > 0) {
      return;
    }

    const intervalId = setInterval(() => {
      void refreshLocalIp();
    }, 4000);

    return () => {
      clearInterval(intervalId);
    };
  }, [role, isNativeHubRunning, connectedClientsCount, refreshLocalIp]);

  // Listener de ciclo de vida do app (Foreground/Background)
  // Quando o app volta para primeiro plano ('active'), restabelece conexões imediatamente sem esperar timers
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void refreshLocalIp();

        if (LocalHub.isAvailable() && !LocalHub.isRunning()) {
          LocalHub.startServer(APP_CONFIG.WEBSOCKET.DEFAULT_PORT).then((ok) => {
            setIsNativeHubRunning(ok || LocalHub.isRunning());
          });
        }

        if (role === 'kds' && clientRef.current) {
          if (clientRef.current.getStatus() !== 'connected') {
            clientRef.current.reconnectNow();
          }
          setConnectedClientsCount(clientRef.current.getPeerCount());
        } else if ((role === 'pos' || role === 'dashboard') && serverRef.current) {
          if (!LocalHub.isAvailable() && serverRef.current.getConnectedClientsCount() === 0) {
            void serverRef.current.discoverAndConnectHub().then(() => {
              if (serverRef.current) {
                setServerStatus(serverRef.current.getStatus());
                setConnectedClientsCount(serverRef.current.getConnectedClientsCount());
                setConnectedHost(serverRef.current.getHubHost());
              }
            });
          } else {
            serverRef.current.reconnectNow();
            setServerStatus(serverRef.current.getStatus());
            setConnectedClientsCount(serverRef.current.getConnectedClientsCount());
            setConnectedHost(serverRef.current.getHubHost());
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [role, refreshLocalIp]);

  const connectToHost = useCallback(
    async (hostOrPayload: string) => {
      const parsed = NetworkDiscovery.parsePairingPayload(hostOrPayload);
      const host = parsed ? parsed.host : hostOrPayload.trim();
      const port = parsed ? parsed.port : APP_CONFIG.WEBSOCKET.DEFAULT_PORT;

      if (role === 'kds' && clientRef.current) {
        await clientRef.current.connect(host, port);
      } else if (serverRef.current) {
        await serverRef.current.connectToHub(host, port);
        setConnectedHost(serverRef.current.getHubHost());
        setServerStatus(serverRef.current.getStatus());
      }
    },
    [role]
  );

  const discoverHub = useCallback(async () => {
    if (!serverRef.current) return null;
    setIsDiscovering(true);
    try {
      const foundHost = await serverRef.current.discoverAndConnectHub();
      setConnectedHost(serverRef.current.getHubHost());
      setServerStatus(serverRef.current.getStatus());
      return foundHost;
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  const disconnectClient = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  return {
    localIp,
    serverStatus,
    connectedClientsCount,
    clientStatus,
    connectedHost,
    isNativeHubRunning,
    isDiscovering,
    discoverHub,
    refreshLocalIp,
    connectToHost,
    disconnectClient,
    client,
    server,
  };
}
