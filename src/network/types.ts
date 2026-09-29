export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export type ServerStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'error';

export interface NetworkInfo {
  ipAddress: string | null;
  isWifiOrHotspot: boolean;
  isConnected: boolean;
}

export interface WebSocketClientOptions {
  autoReconnect?: boolean;
  heartbeatIntervalMs?: number;
  initialReconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  backoffFactor?: number;
}
