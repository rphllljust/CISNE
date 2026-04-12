function readEnv(name: keyof ImportMetaEnv, fallback: string): string {
  const rawEnv = import.meta.env as Record<string, unknown>;
  const value = rawEnv[name as string];

  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readEnvNumber(name: keyof ImportMetaEnv, fallback: number): number {
  const rawValue = readEnv(name, String(fallback));
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export const env = {
  apiBaseUrl: readEnv('VITE_API_BASE_URL', '/api/v1'),
  apiTimeoutMs: readEnvNumber('VITE_API_TIMEOUT_MS', 60_000),
  appName: readEnv('VITE_APP_NAME', 'CISNE RONDONIA COMERCIO E SERVICOS'),
  envName: readEnv('VITE_APP_ENV', 'development')
} as const;
