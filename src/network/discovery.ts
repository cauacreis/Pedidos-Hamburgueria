import { KdsPairingPayload } from '../types/events';
import { APP_CONFIG } from '../constants/config';

export class NetworkDiscovery {
  /**
   * Gera a string JSON para o QR Code do Caixa
   * Formato: {"host": "<IP_LOCAL>", "port": 8080, "role": "kds"}
   */
  static generatePairingPayload(ip: string, port: number = APP_CONFIG.WEBSOCKET.DEFAULT_PORT): string {
    const payload: KdsPairingPayload = {
      host: ip.trim(),
      port,
      role: 'kds',
      timestamp: Date.now(),
    };
    return JSON.stringify(payload);
  }

  /**
   * Valida e decodifica o conteúdo lido pelo scanner da Cozinha
   * Suporta JSON ({"host":"...", "port":8080}), URLs completas (ws://IP:PORT) e IP simples
   */
  static parsePairingPayload(rawContent: string): KdsPairingPayload | null {
    if (!rawContent || typeof rawContent !== 'string') {
      return null;
    }

    const trimmed = rawContent.trim();

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.host === 'string' && parsed.host.length > 0) {
        const cleanHost = parsed.host
          .replace(/^(ws|wss|http|https):\/\//i, '')
          .replace(/\/.*$/, '')
          .trim();
        const port =
          typeof parsed.port === 'number' && parsed.port > 0
            ? parsed.port
            : APP_CONFIG.WEBSOCKET.DEFAULT_PORT;
        return {
          host: cleanHost,
          port,
          role: 'kds',
          timestamp: parsed.timestamp,
        };
      }
    } catch {
      // Se não for JSON, pode ser uma URL completa (ex: "ws://192.168.43.1:8080"),
      // IP:PORT (ex: "192.168.1.100:8080") ou IP simples (ex: "192.168.1.100")
      const cleaned = trimmed
        .replace(/^(ws|wss|http|https):\/\//i, '')
        .replace(/\/.*$/, '')
        .trim();

      const parts = cleaned.split(':');
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        return {
          host: parts[0].trim(),
          port: Number(parts[1]),
          role: 'kds',
        };
      } else if (parts.length === 1 && cleaned.includes('.')) {
        return {
          host: cleaned,
          port: APP_CONFIG.WEBSOCKET.DEFAULT_PORT,
          role: 'kds',
        };
      }
    }

    return null;
  }

  /**
   * Resolve a URL do WebSocket a partir de host e porta, evitando portas duplicadas
   */
  static buildWebSocketUrl(host: string, port: number = APP_CONFIG.WEBSOCKET.DEFAULT_PORT): string {
    let cleanHost = host
      .replace(/^(ws|wss|http|https):\/\//i, '')
      .replace(/\/.*$/, '')
      .trim();
    let finalPort = port;

    if (cleanHost.includes(':')) {
      const [h, p] = cleanHost.split(':');
      cleanHost = h.trim();
      const parsedPort = Number(p);
      if (!isNaN(parsedPort) && parsedPort > 0) {
        finalPort = parsedPort;
      }
    }

    return `ws://${cleanHost}:${finalPort}`;
  }

  /**
   * Obtém o IP local da interface Wi-Fi / Hotspot usando expo-network
   */
  static async getLocalIpAddress(): Promise<string> {
    try {
      const Network = require('expo-network');
      if (Network && typeof Network.getIpAddressAsync === 'function') {
        const ip = await Network.getIpAddressAsync();
        if (ip && ip !== '0.0.0.0' && ip !== '127.0.0.1') {
          return ip;
        }
      }
    } catch (e) {
      // Em simulação ou web, fallback gracioso
    }

    return '192.168.43.1'; // IP padrão típico de roteador/hotspot móvel
  }
}
