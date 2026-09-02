#!/usr/bin/env bash
# Entry point for the macOS launchd daily sync job.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT_DIR}/backups"
mkdir -p "$LOG_DIR"

export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@15/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"

log() {
  echo "[$(date -Iseconds)] $*"
}

log "launchd job started (pid $$)"

if ! command -v pg_isready >/dev/null 2>&1; then
  log "ERROR: pg_isready not found — install PostgreSQL (brew install postgresql@15)"
  exit 1
fi

if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  log "PostgreSQL not running — starting postgresql@15..."
  if command -v brew >/dev/null 2>&1; then
    brew services start postgresql@15 >/dev/null 2>&1 || true
  fi
  for _ in $(seq 1 30); do
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  log "ERROR: PostgreSQL still not accepting connections on localhost:5432"
  exit 1
fi

log "PostgreSQL ready — running production -> local sync"
exec "${ROOT_DIR}/scripts/schedule-db-sync.sh"
