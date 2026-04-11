export interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  API_PREFIX: string;
  CORS_ORIGIN: string;
  TRUST_PROXY: boolean;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  PASSWORD_RESET_EXPIRES_MINUTES: number;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const required = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'JWT_ACCESS_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN'
  ];

  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Variavel obrigatoria ausente: ${key}`);
    }
  }

  return {
    NODE_ENV: (config.NODE_ENV as EnvConfig['NODE_ENV']) ?? 'development',
    PORT: Number(config.PORT ?? 3000),
    API_PREFIX: String(config.API_PREFIX ?? 'api/v1'),
    CORS_ORIGIN: String(config.CORS_ORIGIN ?? '*'),
    TRUST_PROXY: toBoolean(config.TRUST_PROXY, false),
    DATABASE_URL: String(config.DATABASE_URL),
    JWT_ACCESS_SECRET: String(config.JWT_ACCESS_SECRET),
    JWT_ACCESS_EXPIRES_IN: String(config.JWT_ACCESS_EXPIRES_IN ?? '15m'),
    JWT_REFRESH_SECRET: String(config.JWT_REFRESH_SECRET),
    JWT_REFRESH_EXPIRES_IN: String(config.JWT_REFRESH_EXPIRES_IN ?? '7d'),
    PASSWORD_RESET_EXPIRES_MINUTES: Number(config.PASSWORD_RESET_EXPIRES_MINUTES ?? 30),
    LOG_LEVEL: (config.LOG_LEVEL as EnvConfig['LOG_LEVEL']) ?? 'info'
  };
}
