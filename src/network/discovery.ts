import { KdsPairingPayload } from '../types/events';
import { APP_CONFIG } from '../constants/config';
import { LocalHub } from './localHub';

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
   * Extrai lista priorizada de possíveis IPs do Hub local / Roteador (Hotspot)
   * sem depender de internet externa.
   */
  static getCandidateHubIps(savedIp: string | null, deviceIp: string | null): string[] {
    const normalizeHost = (value: string | null): string | null => {
      if (!value || typeof value !== 'string') return null;
      const cleaned = value
        .replace(/^(ws|wss|http|https):\/\//i, '')
        .replace(/\/.*$/, '')
        .split(':')[0]
        .trim();
      return cleaned.length > 0 ? cleaned : null;
    };

    const getPrivateSubnetPrefix = (ip: string | null): string | null => {
      if (!ip) return null;
      const parts = ip.split('.').map(Number);
      if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
        return null;
      }
      if (ip === '127.0.0.1' || ip === '0.0.0.0') return null;
      const isPrivate =
        (parts[0] === 192 && parts[1] === 168) ||
        parts[0] === 10 ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
      if (!isPrivate) return null;
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    };

    const cleanSaved = normalizeHost(savedIp);
    const cleanDevice = normalizeHost(deviceIp);
    const subnetPrefix = getPrivateSubnetPrefix(cleanDevice);

    const candidates: string[] = [];
    const addCandidate = (ip: string | null) => {
      if (!ip) return;
      if (cleanDevice && ip === cleanDevice) return;
      if (!candidates.includes(ip)) {
        candidates.push(ip);
      }
    };

    // 1. Último IP salvo se pertencer à mesma sub-rede /24 atual
    if (cleanSaved && subnetPrefix && cleanSaved.startsWith(`${subnetPrefix}.`)) {
      addCandidate(cleanSaved);
    }

    // 2. Gateway padrão da sub-rede atual (.1)
    if (subnetPrefix) {
      addCandidate(`${subnetPrefix}.1`);
    }

    // 3. Gateways comuns de Hotspot Android e iPhone
    addCandidate('192.168.43.1');
    addCandidate('192.168.137.1');
    addCandidate('172.20.10.1');

    // 4. Último IP salvo de outra sub-rede como fallback final
    if (cleanSaved) {
      addCandidate(cleanSaved);
    }

    return candidates;
  }

  /**
   * Obtém o IP local da interface Hotspot / Wi-Fi priorizando o detector nativo Android
   */
  static async getLocalIpAddress(): Promise<string> {
    if (LocalHub.isAvailable()) {
      const hotspotIp = LocalHub.getPrimaryHotspotIp();
      if (hotspotIp && hotspotIp !== '0.0.0.0' && hotspotIp !== '127.0.0.1') {
        return hotspotIp;
      }
    }

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
