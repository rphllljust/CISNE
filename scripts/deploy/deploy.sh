#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo $ENV_FILE nao encontrado."
  echo "Crie a partir de .env.production.example antes do deploy."
  exit 1
fi

echo "Validando compose..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config >/dev/null

echo "Build das imagens..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build --pull

echo "Subindo banco..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgres

echo "Aplicando migrations..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm migrate

echo "Subindo aplicacao..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d api frontend edge

echo "Status final:"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
