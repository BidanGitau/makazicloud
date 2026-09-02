#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="${ROOT_DIR}/backups/db-sync.log"
INTERVAL_HOURS="${DB_SYNC_INTERVAL_HOURS:-24}"

mkdir -p "${ROOT_DIR}/backups"
echo "[$(date -Iseconds)] Starting scheduled production -> local sync" | tee -a "$LOG_FILE"

if ! "${ROOT_DIR}/scripts/sync-db-from-production.sh" >>"$LOG_FILE" 2>&1; then
  echo "[$(date -Iseconds)] Sync failed — see $LOG_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

echo "[$(date -Iseconds)] Sync finished" | tee -a "$LOG_FILE"
echo "Next run: schedule this script every ${INTERVAL_HOURS}h (cron/launchd)."
