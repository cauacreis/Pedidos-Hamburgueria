import { NetworkDiscovery } from '../network/discovery';

describe('NetworkDiscovery - QR Code Pairing & Protocol Serialization', () => {
  it('generates valid JSON pairing payload with host and port', () => {
    const jsonStr = NetworkDiscovery.generatePairingPayload('192.168.1.150', 8080);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.host).toBe('192.168.1.150');
    expect(parsed.port).toBe(8080);
    expect(parsed.role).toBe('kds');
    expect(parsed.timestamp).toBeDefined();
  });

  it('correctly parses valid JSON payload from QR scan', () => {
    const rawQr = JSON.stringify({ host: '192.168.43.1', port: 8080, role: 'kds' });
    const payload = NetworkDiscovery.parsePairingPayload(rawQr);

    expect(payload).not.toBeNull();
    expect(payload?.host).toBe('192.168.43.1');
    expect(payload?.port).toBe(8080);
    expect(payload?.role).toBe('kds');
  });

  it('gracefully handles raw IP:PORT or simple IP strings as manual fallback', () => {
    const withPort = NetworkDiscovery.parsePairingPayload('10.0.0.42:8080');
    expect(withPort?.host).toBe('10.0.0.42');
    expect(withPort?.port).toBe(8080);

    const ipOnly = NetworkDiscovery.parsePairingPayload('192.168.0.50');
    expect(ipOnly?.host).toBe('192.168.0.50');
    expect(ipOnly?.port).toBe(8080);
  });

  it('rejects invalid or empty QR inputs', () => {
    expect(NetworkDiscovery.parsePairingPayload('')).toBeNull();
    expect(NetworkDiscovery.parsePairingPayload('not-an-ip-or-json')).toBeNull();
  });

  it('builds valid WebSocket URL', () => {
    expect(NetworkDiscovery.buildWebSocketUrl('192.168.1.100', 8080)).toBe('ws://192.168.1.100:8080');
    expect(NetworkDiscovery.buildWebSocketUrl('ws://192.168.1.100', 8080)).toBe('ws://192.168.1.100:8080');
    expect(NetworkDiscovery.buildWebSocketUrl('192.168.1.100:8080', 8080)).toBe('ws://192.168.1.100:8080');
    expect(NetworkDiscovery.buildWebSocketUrl('ws://192.168.1.100:9000', 8080)).toBe('ws://192.168.1.100:9000');
  });

  it('correctly decodes full ws:// and http:// URLs from QR Code', () => {
    const wsUrlPayload = NetworkDiscovery.parsePairingPayload('ws://192.168.43.1:8080');
    expect(wsUrlPayload).not.toBeNull();
    expect(wsUrlPayload?.host).toBe('192.168.43.1');
    expect(wsUrlPayload?.port).toBe(8080);

    const httpUrlPayload = NetworkDiscovery.parsePairingPayload('http://192.168.1.50:8080/');
    expect(httpUrlPayload).not.toBeNull();
    expect(httpUrlPayload?.host).toBe('192.168.1.50');
    expect(httpUrlPayload?.port).toBe(8080);

    const wsNoPort = NetworkDiscovery.parsePairingPayload('ws://192.168.43.1');
    expect(wsNoPort?.host).toBe('192.168.43.1');
    expect(wsNoPort?.port).toBe(8080);
  });
});
