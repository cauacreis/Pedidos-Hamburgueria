import { requireOptionalNativeModule } from 'expo';
import { APP_CONFIG } from '../constants/config';

export interface LocalHubNativeModule {
  startServer(port: number): Promise<boolean>;
  stopServer(): Promise<boolean>;
  isRunning(): boolean;
  getConnectedClientsCount(): number;
  getLocalIps(): string[];
  getPrimaryHotspotIp(): string;
}

function getNativeModule(): LocalHubNativeModule | null {
  try {
    return requireOptionalNativeModule<LocalHubNativeModule>('LocalHub') ?? null;
  } catch {
    return null;
  }
}

export const LocalHub = {
  isAvailable(): boolean {
    return getNativeModule() !== null;
  },

  async startServer(port: number = APP_CONFIG.WEBSOCKET.DEFAULT_PORT): Promise<boolean> {
    const mod = getNativeModule();
    if (!mod) return false;
    try {
      return await mod.startServer(port);
    } catch {
      return false;
    }
  },

  async stopServer(): Promise<boolean> {
    const mod = getNativeModule();
    if (!mod) return false;
    try {
      return await mod.stopServer();
    } catch {
      return false;
    }
  },

  isRunning(): boolean {
    const mod = getNativeModule();
    if (!mod) return false;
    try {
      return Boolean(mod.isRunning());
    } catch {
      return false;
    }
  },

  getConnectedClientsCount(): number {
    const mod = getNativeModule();
    if (!mod) return 0;
    try {
      return Number(mod.getConnectedClientsCount()) || 0;
    } catch {
      return 0;
    }
  },

  getLocalIps(): string[] {
    const mod = getNativeModule();
    if (!mod) return [];
    try {
      const ips = mod.getLocalIps();
      return Array.isArray(ips) ? ips : [];
    } catch {
      return [];
    }
  },

  getPrimaryHotspotIp(): string | null {
    const mod = getNativeModule();
    if (!mod) return null;
    try {
      const ip = mod.getPrimaryHotspotIp();
      return ip && ip.trim().length > 0 ? ip.trim() : null;
    } catch {
      return null;
    }
  },
};
