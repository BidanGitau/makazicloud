#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${ROOT_DIR}/scripts/.db-sync.env"
LABEL="com.makazicloud.db-sync"
PLIST_PATH="${HOME}/Library/LaunchAgents/${LABEL}.plist"
RUN_SCRIPT="${ROOT_DIR}/scripts/db-sync-launchd-run.sh"

# shellcheck source=lib/db-sync-common.sh
source "${ROOT_DIR}/scripts/lib/db-sync-common.sh"

SYNC_HOUR="${DB_SYNC_HOUR:-6}"
SYNC_MINUTE="${DB_SYNC_MINUTE:-0}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing ${CONFIG_FILE}. Copy scripts/.db-sync.env.example first." >&2
  exit 1
fi

chmod +x "$RUN_SCRIPT"
chmod +x "${ROOT_DIR}/scripts/schedule-db-sync.sh"
chmod +x "${ROOT_DIR}/scripts/sync-db-from-production.sh"
mkdir -p "${ROOT_DIR}/backups"

cat >"$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${RUN_SCRIPT}</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>${SYNC_HOUR}</integer>
    <key>Minute</key>
    <integer>${SYNC_MINUTE}</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${ROOT_DIR}/backups/db-sync-launchd.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>${ROOT_DIR}/backups/db-sync-launchd.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>HOME</key>
    <string>${HOME}</string>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/opt/homebrew/opt/postgresql@15/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

UID_NUM="$(id -u)"
launchctl bootout "gui/${UID_NUM}/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/${UID_NUM}" "$PLIST_PATH"

echo "Installed daily DB sync launch agent."
echo "  Schedule: ${SYNC_HOUR}:$(printf '%02d' "$SYNC_MINUTE") every day"
echo "  Plist:    ${PLIST_PATH}"
echo "  Logs:     ${ROOT_DIR}/backups/db-sync.log"
echo ""
echo "Test now:  launchctl kickstart -k gui/${UID_NUM}/${LABEL}"
echo "Remove:    npm run db:sync:uninstall-launchd"
