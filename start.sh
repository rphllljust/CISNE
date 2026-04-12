#!/bin/sh
set -e

echo "[start] Syncing database schema..."
# Tenta db push com timeout de 60s; se falhar, continua mesmo assim
timeout 60 npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
  echo "[start] Warning: db push failed or timed out, starting server anyway..."
}

echo "[start] Starting NestJS server..."
exec node dist/main.js
