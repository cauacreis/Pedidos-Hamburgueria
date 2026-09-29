import { PosWebSocketServer } from '../network/server';
import { KdsWebSocketClient } from '../network/client';
import { SocketMessage } from '../types/events';
import { Order } from '../types/database';

describe('Network Layer - WebSocket Server & Client Architecture', () => {
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
