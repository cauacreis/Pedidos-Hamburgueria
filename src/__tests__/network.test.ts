import AsyncStorage from '@react-native-async-storage/async-storage';
import { PosWebSocketServer } from '../network/server';
import { KdsWebSocketClient } from '../network/client';
import { SocketMessage } from '../types/events';
import { APP_CONFIG } from '../constants/config';

describe('Network Layer - WebSocket Server & Client Architecture', () => {
  afterEach(() => {
    PosWebSocketServer.getInstance(8080).stop();
    jest.restoreAllMocks();
  });

  it('instantiates PosWebSocketServer singleton and reports status', () => {
    const server = PosWebSocketServer.getInstance(8080);
    expect(server).toBeDefined();
    expect(server.getConnectedClientsCount()).toBe(0);
  });

  it('notifies client listeners when server broadcasts messages', (done) => {
    const server = PosWebSocketServer.getInstance(8080);

    const unsubscribe = server.onMessage((msg: SocketMessage) => {
      if (msg.type === 'ORDER_STATUS_CHANGED') {
        expect(msg.payload.order_id).toBe('test-ord-123');
        expect(msg.payload.status).toBe('ready');
        unsubscribe();
        done();
      }
    });

    server.broadcastOrderStatusChanged('test-ord-123', 'ready');
  });

  it('connects PosWebSocketServer to local Hub IP, persists IP, and tracks CLIENT_COUNT', async () => {
    const createdSockets: any[] = [];
    const MockWebSocket = jest.fn().mockImplementation((url: string) => {
      const socket: any = {
        url,
        readyState: 1,
        send: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      };
      createdSockets.push(socket);
      return socket;
    });

    const originalWs = (global as any).WebSocket;
    (global as any).WebSocket = MockWebSocket;
    const setItemSpy = jest.spyOn(AsyncStorage, 'setItem').mockResolvedValue();

    try {
      const server = PosWebSocketServer.getInstance(8080);
      const ok = await server.connectToHub('192.168.43.1', 8080, true);

      expect(ok).toBe(true);
      expect(server.getHubHost()).toBe('192.168.43.1');
      expect(setItemSpy).toHaveBeenCalledWith(APP_CONFIG.STORAGE_KEYS.LAST_SERVER_IP, '192.168.43.1');
      expect(MockWebSocket).toHaveBeenCalledWith('ws://192.168.43.1:8080');

      const ws = createdSockets[0];
      await ws.onopen();

      let observedCount = 0;
      const unsubCount = server.onClientCountChange((count) => {
        observedCount = count;
      });

      await ws.onmessage({
        data: JSON.stringify({
          id: 'cnt_1',
          timestamp: Date.now(),
          type: 'CLIENT_COUNT',
          payload: { count: 2 },
        }),
      });

      expect(server.getConnectedClientsCount()).toBe(2);
      expect(observedCount).toBe(2);

      // Simula socket fechado para testar reconnectNow
      ws.readyState = 3;
      server.reconnectNow();
      expect(MockWebSocket).toHaveBeenCalledTimes(2);

      unsubCount();
    } finally {
      (global as any).WebSocket = originalWs;
    }
  });

  it('configures KdsWebSocketClient with backoff intervals and initial disconnected state', () => {
    const client = new KdsWebSocketClient({
      autoReconnect: true,
      initialReconnectDelayMs: 500,
      maxReconnectDelayMs: 5000,
      backoffFactor: 2,
    });

    expect(client.getStatus()).toBe('disconnected');
    expect(client.getUrl()).toBeNull();
  });
});
