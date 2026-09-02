#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
CONFIG_FILE="${ROOT_DIR}/scripts/.db-sync.env"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "$CONFIG_FILE"
  set +a
fi

: "${PROD_SSH_HOST:=}"
: "${PROD_SSH_USER:=root}"
: "${PROD_SSH_KEY:=$HOME/.ssh/makazicloud_deploy_ci}"
: "${PROD_APP_DIR:=/home/bidan/makazicloud}"
: "${LOCAL_DATABASE_URL:=postgresql://bidan@localhost:5432/makazicloud?schema=public}"
: "${BACKUP_DIR:=backups}"
: "${KEEP_BACKUPS:=14}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_prod_config() {
  if [[ -z "$PROD_SSH_HOST" ]]; then
    echo "Set PROD_SSH_HOST in scripts/.db-sync.env (copy from .db-sync.env.example)." >&2
    exit 1
  fi
}

backup_dir_abs() {
  if [[ "$BACKUP_DIR" = /* ]]; then
    echo "$BACKUP_DIR"
  else
    echo "${ROOT_DIR}/${BACKUP_DIR}"
  fi
}

timestamp() {
  date +"%Y%m%d-%H%M%S"
}

pg_url() {
  # pg_dump/psql do not accept Prisma-style query params like ?schema=public
  local url="$1"
  url="${url%%\?*}"
  echo "$url"
}

prune_old_backups() {
  local dir="$1"
  local prefix="$2"
  local keep="$3"
  local count=0
  while IFS= read -r file; do
    count=$((count + 1))
    if ((count > keep)); then
      rm -f "$file"
      echo "Pruned old backup: $file"
    fi
  done < <(ls -1t "${dir}/${prefix}"-*.sql.gz 2>/dev/null || true)
}

ssh_prod() {
  ssh -i "$PROD_SSH_KEY" -o IdentitiesOnly=yes "${PROD_SSH_USER}@${PROD_SSH_HOST}" "$@"
}

dump_production_to_file() {
  local output_file="$1"
  echo "Downloading production database from ${PROD_SSH_HOST}..."
  # Strip Prisma ?schema=... on remote before pg_dump (same as pg_url locally).
  ssh_prod "set -a && . '${PROD_APP_DIR}/apps/api/.env' && set +a && pg_dump \"\${DATABASE_URL%%\?*}\" --no-owner --no-acl --clean --if-exists --format=plain" \
    | gzip -c >"$output_file"
  echo "Saved: $output_file"
}

restore_dump_to_url() {
  local dump_file="$1"
  local database_url="$2"
  local clean_url
  clean_url="$(pg_url "$database_url")"
  local db_name="${clean_url##*/}"

  echo "Recreating local database '${db_name}' for clean restore..."
  psql postgres -v ON_ERROR_STOP=1 -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db_name}' AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || true
  dropdb --if-exists "$db_name"
  createdb "$db_name"

  echo "Restoring dump into target database..."
  gunzip -c "$dump_file" | psql "$clean_url" -v ON_ERROR_STOP=1 >/dev/null
  echo "Restore complete."
  echo "If the API is running locally, restart it (npm run dev:all) so database connections refresh."
}
