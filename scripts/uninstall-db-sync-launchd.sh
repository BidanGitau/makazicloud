#!/usr/bin/env bash
set -euo pipefail

LABEL="com.makazicloud.db-sync"
PLIST_PATH="${HOME}/Library/LaunchAgents/${LABEL}.plist"
UID_NUM="$(id -u)"

launchctl bootout "gui/${UID_NUM}/${LABEL}" 2>/dev/null || true
rm -f "$PLIST_PATH"

echo "Removed daily DB sync launch agent (${LABEL})."
