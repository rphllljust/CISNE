import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },

    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET ?? 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },

    preview: {
      port: 4173
    },

    build: {
      target: 'es2022',
      sourcemap: mode !== 'production'
    },

    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html'],
        include: ['src/**/*.{ts,tsx}']
      }
    }
  };
});
