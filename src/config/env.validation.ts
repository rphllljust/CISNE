export interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  API_PREFIX: string;
  SWAGGER_PATH: string;
  APP_VERSION: string;
  CORS_ORIGIN: string;
  TRUST_PROXY: boolean;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;
  PASSWORD_RESET_EXPIRES_MINUTES: number;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  ENABLE_DEV_RESET_TOKEN_LOG: boolean;
}
const WEAK_SECRET_PATTERNS = ['secret', 'changeme', 'default', 'password', 'admin', 'test'];

function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function isValidHttpOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.host);
  } catch {
    return false;
  }
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

  const nodeEnv = (config.NODE_ENV as EnvConfig['NODE_ENV']) ?? 'development';
  const corsOrigin = String(config.CORS_ORIGIN ?? '');
  const normalizedOrigins = parseCorsOrigins(corsOrigin);
  const isStrictEnv = nodeEnv === 'production' || nodeEnv === 'test';

  if (isStrictEnv) {
    if (normalizedOrigins.length === 0) {
      throw new Error('CORS_ORIGIN obrigatoria em ambiente estrito (producao/homologacao)');
    }
    if (normalizedOrigins.includes('*')) {
      throw new Error('CORS_ORIGIN=* nao permitido em ambiente estrito (producao/homologacao)');
    }
  } else if (normalizedOrigins.length === 0) {
    normalizedOrigins.push('http://localhost:5173');
  }

  for (const origin of normalizedOrigins) {
    if (!isValidHttpOrigin(origin)) {
      throw new Error(`CORS_ORIGIN contem URL invalida: ${origin}`);
    }
  }

  const accessSecret = String(config.JWT_ACCESS_SECRET);
  const refreshSecret = String(config.JWT_REFRESH_SECRET);
  const databaseUrl = String(config.DATABASE_URL);
  const smtpUser = config.SMTP_USER ? String(config.SMTP_USER) : '';
  const smtpPassword = config.SMTP_PASSWORD ? String(config.SMTP_PASSWORD) : '';

  const isWeakSecret = (value: string): boolean => {
    const normalized = value.trim().toLowerCase();
    return WEAK_SECRET_PATTERNS.some((pattern) => normalized.includes(pattern));
  };

  if (isStrictEnv) {
    if (accessSecret.length < 32) {
      throw new Error('JWT_ACCESS_SECRET deve ter no minimo 32 caracteres em ambiente estrito');
    }
    if (refreshSecret.length < 32) {
      throw new Error('JWT_REFRESH_SECRET deve ter no minimo 32 caracteres em ambiente estrito');
    }
    if (isWeakSecret(accessSecret)) {
      throw new Error('JWT_ACCESS_SECRET fraco/proibido em ambiente estrito');
    }
    if (isWeakSecret(refreshSecret)) {
      throw new Error('JWT_REFRESH_SECRET fraco/proibido em ambiente estrito');
    }
    if (accessSecret === refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET deve ser diferente de JWT_ACCESS_SECRET');
    }
    if (
      !databaseUrl.startsWith('postgresql://') &&
      !databaseUrl.startsWith('postgres://')
    ) {
      throw new Error('DATABASE_URL deve usar postgres em ambiente estrito');
    }
    if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
      throw new Error('DATABASE_URL nao deve apontar para localhost em ambiente estrito');
    }
  }

  if ((smtpUser && !smtpPassword) || (!smtpUser && smtpPassword)) {
    throw new Error('SMTP_USER e SMTP_PASSWORD devem ser definidos juntos');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: Number(config.PORT ?? 3000),
    API_PREFIX: String(config.API_PREFIX ?? 'api/v1'),
    SWAGGER_PATH: String(config.SWAGGER_PATH ?? 'docs').replace(/^\/+/, ''),
    APP_VERSION: String(config.APP_VERSION ?? '0.0.0'),
    CORS_ORIGIN: normalizedOrigins.join(','),
    TRUST_PROXY: toBoolean(config.TRUST_PROXY, false),
    DATABASE_URL: String(config.DATABASE_URL),
    JWT_ACCESS_SECRET: accessSecret,
    JWT_ACCESS_EXPIRES_IN: String(config.JWT_ACCESS_EXPIRES_IN ?? '15m'),
    JWT_REFRESH_SECRET: refreshSecret,
    JWT_REFRESH_EXPIRES_IN: String(config.JWT_REFRESH_EXPIRES_IN ?? '7d'),
    PASSWORD_RESET_EXPIRES_MINUTES: Number(config.PASSWORD_RESET_EXPIRES_MINUTES ?? 30),
    LOG_LEVEL: (config.LOG_LEVEL as EnvConfig['LOG_LEVEL']) ?? 'info',
    ENABLE_DEV_RESET_TOKEN_LOG: (() => {
      const flag = toBoolean(config.ENABLE_DEV_RESET_TOKEN_LOG, false);
      if (nodeEnv === 'production' && flag) {
        throw new Error('ENABLE_DEV_RESET_TOKEN_LOG nao permitido em producao');
      }
      return flag;
    })()
  };
}
