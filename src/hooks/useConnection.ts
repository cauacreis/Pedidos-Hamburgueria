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

  const clientRef = useRef<KdsWebSocketClient | null>(null);
  const serverRef = useRef<PosWebSocketServer | null>(null);

  // Inicialização para Caixa
  useEffect(() => {
    if (role === 'pos') {
      const server = PosWebSocketServer.getInstance(APP_CONFIG.WEBSOCKET.DEFAULT_PORT);
      serverRef.current = server;

      NetworkDiscovery.getLocalIpAddress().then((ip) => {
        setLocalIp(ip);
      });

      server.start().then(() => {
        setServerStatus(server.getStatus());
      });

      const unsubCount = server.onClientCountChange((count) => {
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
      const client = new KdsWebSocketClient();
      clientRef.current = client;

      const unsubStatus = client.onStatusChange((status) => {
        setClientStatus(status);
        if (status === 'connected') {
          setConnectedHost(client.getUrl());
        }
      });

      // Tentar reconectar automaticamente com último IP gravado
      client.connectLastSaved();

      return () => {
        unsubStatus();
        client.disconnect();
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
    client: clientRef.current,
    server: serverRef.current,
  };
}
