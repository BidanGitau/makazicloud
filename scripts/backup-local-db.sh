#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/db-sync-common.sh
source "${ROOT_DIR}/scripts/lib/db-sync-common.sh"

require_command pg_dump
require_command gzip

mkdir -p "$(backup_dir_abs)"
STAMP="$(timestamp)"
OUTPUT="$(backup_dir_abs)/local-${STAMP}.sql.gz"

echo "Backing up local database..."
pg_dump "$(pg_url "$LOCAL_DATABASE_URL")" --no-owner --no-acl --format=plain | gzip -c >"$OUTPUT"
echo "Saved: $OUTPUT"

prune_old_backups "$(backup_dir_abs)" "local" "$KEEP_BACKUPS"
