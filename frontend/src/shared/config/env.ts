function readEnv(name: keyof ImportMetaEnv, fallback: string): string {
  const rawEnv = import.meta.env as Record<string, unknown>;
  const value = rawEnv[name as string];

  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export const env = {
  apiBaseUrl: readEnv('VITE_API_BASE_URL', '/api/v1'),
  appName: readEnv('VITE_APP_NAME', 'OMS Console'),
  envName: readEnv('VITE_APP_ENV', 'development')
} as const;
