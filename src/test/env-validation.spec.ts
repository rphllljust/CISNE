import { validateEnv } from '../config/env.validation';

const base = {
  NODE_ENV: 'production',
  PORT: '3000',
  API_PREFIX: 'api/v1',
  CORS_ORIGIN: 'https://app.seudominio.com',
  TRUST_PROXY: 'true',
  DATABASE_URL: 'postgresql://oms:strongpass@db-prod.internal:5432/oms?schema=public',
  JWT_ACCESS_SECRET: 'V3ryStr0ngR4nd0mAcc3ssKey_123456789!',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'V3ryStr0ngR4nd0mR3fr3shKey_987654321!',
  JWT_REFRESH_EXPIRES_IN: '7d',
  PASSWORD_RESET_EXPIRES_MINUTES: '30',
  LOG_LEVEL: 'info'
};

describe('env validation hardening', () => {
  it('fails with weak access secret', () => {
    expect(() =>
      validateEnv({ ...base, JWT_ACCESS_SECRET: 'secret' })
    ).toThrow('JWT_ACCESS_SECRET');
  });

  it('fails when refresh equals access', () => {
    expect(() =>
      validateEnv({
        ...base,
        JWT_REFRESH_SECRET: String(base.JWT_ACCESS_SECRET)
      })
    ).toThrow('diferente');
  });

  it('fails with localhost database in strict env', () => {
    expect(() =>
      validateEnv({
        ...base,
        DATABASE_URL: 'postgresql://oms:pass@localhost:5432/oms'
      })
    ).toThrow('localhost');
  });

  it('passes with strong strict config', () => {
    expect(() => validateEnv(base)).not.toThrow();
  });
});
