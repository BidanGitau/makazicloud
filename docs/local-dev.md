# Local Development

Guide for working on MakaziCloud locally with a production database mirror.

## Mental model

```text
Production (live)          Local (your Mac)
─────────────────          ────────────────
Real data  ──pull──►       Mirror for testing
Code       ◄──deploy──     Where you build features
```

- **Production is the source of truth for data.**
- **Git + deploy is the path for code changes.**
- Local changes to data do **not** sync to production automatically.

## Daily startup

```bash
brew services start postgresql@15
pg_isready -h localhost -p 5432
npm run dev:all
```

Open [http://localhost:5173](http://localhost:5173). The web app proxies `/api` to the API on port 4000.

Quick health check:

```bash
curl http://localhost:4000/api/health
```

Should return `{"ok":true,"service":"makazicloud-api"}`. If this fails, login will show **500** in the browser (API down), not a bad password.

## Database sync

| Command | What it does |
|---------|----------------|
| `npm run db:sync:pull` | Download prod DB and replace local `makazicloud` |
| `npm run db:sync:pull:download` | Download only; does not overwrite local |
| `npm run db:backup:local` | Snapshot current local DB before risky work |
| `npm run db:sync:install-launchd` | Install daily auto-sync (default 9:00 AM) |
| `npm run db:sync:uninstall-launchd` | Remove daily auto-sync |

Config: copy `scripts/.db-sync.env.example` to `scripts/.db-sync.env` (gitignored).

Each pull **backs up** your current local DB to `backups/local-before-prod-*.sql.gz`, then **drops and recreates** the local database from production. Assume local-only test data can disappear after a sync.

**After a DB pull or the 9 AM sync**, restart the API if it was already running (`Ctrl+C` then `npm run dev:all`). Otherwise you may see **500** errors on arrears/tenants until connections refresh.

**Do not** use `npm run db:sync:restore-prod` for normal development. It overwrites the hosted production database and requires explicit confirmation.

## What to do where

| Change | Where to do it |
|--------|----------------|
| UI, API, bug fixes, new features | Code locally → test → deploy |
| Real payments, rent changes, tenants, properties | Production → pull locally when needed |
| Throwaway experiments | Local only; expect loss on next sync |

## Recommended workflow

1. Start Postgres and `npm run dev:all`.
2. Work on a feature branch.
3. Test against the prod-synced local DB (realistic data).
4. Commit, merge, deploy to Contabo via `scripts/deploy-production.sh`.
5. Make real business changes on production; pull locally if you need them for testing.

## Login locally

Use the same email and password as production (password hashes are copied with the sync).

Forgot password in development: use **Forgot password** on the login page. The reset link is printed in the API terminal as `[dev] Password reset link...` (email is not sent unless `SEND_EMAIL_IN_DEV=true`).

Wrong password returns **401**. **500** usually means PostgreSQL or the API is not running.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Login 500 | API not running | `brew services start postgresql@15`, restart `npm run dev:all` |
| `ECONNREFUSED 127.0.0.1:4000` | API crashed on startup | Check API terminal for `Can't reach database server` |
| Stale data locally | Last sync was a while ago | `npm run db:sync:pull` |
| Local test data missing | Daily sync or manual pull | Expected; restore from `backups/local-before-prod-*.sql.gz` if needed |

## Environment files

- `apps/api/.env` — API secrets, `DATABASE_URL`, etc.
- `apps/web/.env` — `VITE_API_BASE_URL="/api"` for local proxy

Never commit `.env` files or `scripts/.db-sync.env`.

## Deploy to production

Build and deploy on the server (see `scripts/deploy-production.sh`):

```bash
npm ci
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npm run build:api
VITE_API_BASE_URL="https://makazicloud.com/api" npm run build --workspace=@makazicloud/web
pm2 startOrReload ecosystem.config.cjs --update-env
```

Code does not go live until this (or your CI/CD equivalent) runs on the host.
