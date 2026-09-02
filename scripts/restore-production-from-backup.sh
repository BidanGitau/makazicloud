#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/db-sync-common.sh
source "${ROOT_DIR}/scripts/lib/db-sync-common.sh"

DUMP_FILE="${1:-}"
CONFIRM="${CONFIRM:-}"

if [[ -z "$DUMP_FILE" ]]; then
  echo "Usage: CONFIRM=YES-I-UNDERSTAND $0 <backup.sql.gz>" >&2
  echo "Example: CONFIRM=YES-I-UNDERSTAND npm run db:sync:restore-prod -- backups/prod-20260901-120000.sql.gz" >&2
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Backup file not found: $DUMP_FILE" >&2
  exit 1
fi

if [[ "$CONFIRM" != "YES-I-UNDERSTAND" ]]; then
  echo "This OVERWRITES the hosted production database." >&2
  echo "Re-run with: CONFIRM=YES-I-UNDERSTAND $0 $DUMP_FILE" >&2
  exit 1
fi

require_command psql
require_command ssh
require_prod_config

STAMP="$(timestamp)"

echo "Creating pre-restore safety dump on production..."
ssh_prod "set -a && . '${PROD_APP_DIR}/apps/api/.env' && set +a && pg_dump \"\$DATABASE_URL\" --no-owner --no-acl --format=plain | gzip -c" >"${ROOT_DIR}/$(backup_dir_abs)/prod-pre-restore-${STAMP}.sql.gz"
echo "Saved local copy of production before restore."

echo "Uploading and restoring ${DUMP_FILE} to production..."
gunzip -c "$DUMP_FILE" | ssh_prod "set -a && . '${PROD_APP_DIR}/apps/api/.env' && set +a && psql \"\$DATABASE_URL\" -v ON_ERROR_STOP=1"

echo "Production database restored from ${DUMP_FILE}."
echo "Restart API on server: pm2 startOrReload ecosystem.config.cjs --update-env"
