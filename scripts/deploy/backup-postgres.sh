#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Arquivo $ENV_FILE nao encontrado."
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

BACKUP_DIR="${1:-$ROOT_DIR/backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
FILENAME="$BACKUP_DIR/oms_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

echo "Gerando backup em $FILENAME..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip -9 >"$FILENAME"

echo "Backup finalizado."
