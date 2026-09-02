#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/db-sync-common.sh
source "${ROOT_DIR}/scripts/lib/db-sync-common.sh"

DOWNLOAD_ONLY="${DOWNLOAD_ONLY:-0}"
if [[ "${1:-}" == "--download-only" ]]; then
  DOWNLOAD_ONLY=1
fi

require_command pg_dump
require_command psql
require_command gzip
require_command ssh
require_prod_config

mkdir -p "$(backup_dir_abs)"
STAMP="$(timestamp)"
PROD_DUMP="$(backup_dir_abs)/prod-${STAMP}.sql.gz"

# Safety snapshot of current local DB before overwrite.
if [[ "$DOWNLOAD_ONLY" != "1" ]]; then
  LOCAL_SNAPSHOT="$(backup_dir_abs)/local-before-prod-${STAMP}.sql.gz"
  echo "Backing up current local database..."
  pg_dump "$(pg_url "$LOCAL_DATABASE_URL")" --no-owner --no-acl --format=plain | gzip -c >"$LOCAL_SNAPSHOT"
  echo "Saved local snapshot: $LOCAL_SNAPSHOT"
fi

dump_production_to_file "$PROD_DUMP"
prune_old_backups "$(backup_dir_abs)" "prod" "$KEEP_BACKUPS"
prune_old_backups "$(backup_dir_abs)" "local-before-prod" "$KEEP_BACKUPS"

if [[ "$DOWNLOAD_ONLY" == "1" ]]; then
  echo "Download-only mode: local database was not changed."
  exit 0
fi

restore_dump_to_url "$PROD_DUMP" "$(pg_url "$LOCAL_DATABASE_URL")"

echo ""
echo "Local database now mirrors production (${PROD_DUMP})."
echo "Run: npm run dev:api"
