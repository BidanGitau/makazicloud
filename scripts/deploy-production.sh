#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/bidan/makazicloud"
LOCK_FILE="/tmp/makazicloud-deploy.lock"

cd "$APP_DIR"

if [[ ! -f "apps/api/.env" ]]; then
  echo "Missing apps/api/.env on server. Deployment cannot continue."
  exit 1
fi

if [[ ! -f "apps/web/.env" ]]; then
  echo "Missing apps/web/.env on server. Deployment cannot continue."
  exit 1
fi

(
  flock -n 9 || {
    echo "Another MakaziCloud deployment is already running."
    exit 1
  }

  npm ci
  npx prisma generate --schema apps/api/prisma/schema.prisma

  set -a
  . apps/api/.env
  set +a

  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
  npm run build:api
  VITE_API_BASE_URL="https://makazicloud.com/api" \
  VITE_DEFAULT_TENANT_SLUG="makazicloud" \
    npm run build --workspace=@makazicloud/web

  pm2 startOrReload ecosystem.config.cjs --update-env
  pm2 save
) 9>"$LOCK_FILE"
