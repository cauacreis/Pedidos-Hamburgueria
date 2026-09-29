import { useState, useEffect, useCallback, useRef } from 'react';
import { PosWebSocketServer } from '../network/server';
import { KdsWebSocketClient } from '../network/client';
import { ConnectionStatus, ServerStatus } from '../network/types';
import { NetworkDiscovery } from '../network/discovery';
import { APP_CONFIG } from '../constants/config';

export function useConnection(role: 'pos' | 'kds' | 'dashboard') {
  // Estado do Caixa (Servidor)
  const [localIp, setLocalIp] = useState<string>('192.168.43.1');
  const [serverStatus, setServerStatus] = useState<ServerStatus>('idle');
  const [connectedClientsCount, setConnectedClientsCount] = useState<number>(0);

  // Estado da Cozinha (Cliente)
  const [clientStatus, setClientStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedHost, setConnectedHost] = useState<string | null>(null);

  // Instâncias ativas em estado reativo para propagação limpa aos hooks
  const [client, setClient] = useState<KdsWebSocketClient | null>(null);
  const [server, setServer] = useState<PosWebSocketServer | null>(null);

  const clientRef = useRef<KdsWebSocketClient | null>(null);
  const serverRef = useRef<PosWebSocketServer | null>(null);

  // Inicialização para Caixa (mantém servidor ativo mesmo se alternar temporariamente para o Dashboard)
  useEffect(() => {
    if (role === 'pos' || role === 'dashboard') {
      const srv = PosWebSocketServer.getInstance(APP_CONFIG.WEBSOCKET.DEFAULT_PORT);
      serverRef.current = srv;
      setServer(srv);

      NetworkDiscovery.getLocalIpAddress().then((ip) => {
        setLocalIp(ip);
      });

      srv.start().then(() => {
        setServerStatus(srv.getStatus());
      });

      const unsubCount = srv.onClientCountChange((count) => {
        setConnectedClientsCount(count);
      });

      return () => {
        unsubCount();
      };
    }
  }, [role]);

  // Inicialização para Cozinha
  useEffect(() => {
    if (role === 'kds') {
      const cli = new KdsWebSocketClient();
      clientRef.current = cli;
      setClient(cli);

      const unsubStatus = cli.onStatusChange((status) => {
        setClientStatus(status);
        if (status === 'connected') {
          setConnectedHost(cli.getUrl());
        }
      });

      // Tentar reconectar automaticamente com último IP gravado
      cli.connectLastSaved();

      return () => {
        unsubStatus();
        cli.disconnect();
      };
    }
  }, [role]);

  const connectToHost = useCallback(async (hostOrPayload: string) => {
    const parsed = NetworkDiscovery.parsePairingPayload(hostOrPayload);
    const host = parsed ? parsed.host : hostOrPayload.trim();
    const port = parsed ? parsed.port : APP_CONFIG.WEBSOCKET.DEFAULT_PORT;

    if (clientRef.current) {
      await clientRef.current.connect(host, port);
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
    connectToHost,
    disconnectClient,
    client,
    server,
  };
}
