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
   */
  static parsePairingPayload(rawContent: string): KdsPairingPayload | null {
    if (!rawContent || typeof rawContent !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(rawContent.trim());
      if (parsed && typeof parsed.host === 'string' && parsed.host.length > 0) {
        const port = typeof parsed.port === 'number' && parsed.port > 0 ? parsed.port : APP_CONFIG.WEBSOCKET.DEFAULT_PORT;
        return {
          host: parsed.host.trim(),
          port,
          role: parsed.role === 'kds' ? 'kds' : 'kds',
          timestamp: parsed.timestamp,
        };
      }
    } catch {
      // Se não for JSON, pode ser um IP simples inserido diretamente ou lido de QR simples (ex: "192.168.1.100" ou "192.168.1.100:8080")
      const trimmed = rawContent.trim();
      const parts = trimmed.split(':');
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        return {
          host: parts[0],
          port: Number(parts[1]),
          role: 'kds',
        };
      } else if (parts.length === 1 && trimmed.includes('.')) {
        return {
          host: trimmed,
          port: APP_CONFIG.WEBSOCKET.DEFAULT_PORT,
          role: 'kds',
        };
      }
    }

    return null;
  }

  /**
   * Resolve a URL do WebSocket a partir de host e porta
   */
  static buildWebSocketUrl(host: string, port: number = APP_CONFIG.WEBSOCKET.DEFAULT_PORT): string {
    const cleanHost = host.replace(/^ws:\/\//, '').replace(/^http:\/\//, '').replace(/\/$/, '');
    return `ws://${cleanHost}:${port}`;
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
