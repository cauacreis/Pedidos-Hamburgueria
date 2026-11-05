export const APP_CONFIG = {
  WEBSOCKET: {
    DEFAULT_PORT: 8080,
    HEARTBEAT_INTERVAL_MS: 5000,
    HEARTBEAT_TIMEOUT_MS: 15000,
    INITIAL_RECONNECT_DELAY_MS: 1000,
    MAX_RECONNECT_DELAY_MS: 10000,
    RECONNECT_BACKOFF_FACTOR: 1.5,
  },
  KDS: {
    WARNING_TIME_MINUTES: 7,   // Transição para cor de atenção no KDS
    URGENT_TIME_MINUTES: 14,   // Transição para cor de urgência no KDS
  },
  ORDERS: {
    DEFAULT_STALE_HOURS: 2,    // Pedidos em espera por mais de X horas são deletados automaticamente
    CLEANUP_INTERVAL_MS: 60000, // Verificação periódica automática a cada 60 segundos
  },
  SUPABASE: {
    // Configurações lidas de env ou fallback local
    URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://demo-foodtruck.supabase.co',
    ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-key',
    SYNC_BATCH_SIZE: 50,
  },
  STORAGE_KEYS: {
    LAST_SERVER_IP: '@foodtruck/last_server_ip',
    APP_ROLE: '@foodtruck/app_role', // 'pos' | 'kds' | 'dashboard'
    STALE_HOURS: '@foodtruck/stale_hours', // Horas limite configuradas pelo usuário
  },
};
