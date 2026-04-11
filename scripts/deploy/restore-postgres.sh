#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_FILE="${1:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "Uso: ./scripts/deploy/restore-postgres.sh <arquivo.sql|arquivo.sql.gz>"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Arquivo de backup nao encontrado: $BACKUP_FILE"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo $ENV_FILE nao encontrado."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

echo "Restaurando banco ${POSTGRES_DB}..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" | docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
else
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" <"$BACKUP_FILE"
fi

echo "Restore concluido."
