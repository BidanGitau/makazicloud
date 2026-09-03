#!/usr/bin/env bash
# Reconcile one billing month's arrears against payments + unit rent.
# Usage:
#   bash scripts/reconcile-month-arrears.sh            # dry-run August (previous month)
#   bash scripts/reconcile-month-arrears.sh 2026-08     # dry-run specific month
#   APPLY=1 bash scripts/reconcile-month-arrears.sh 2026-08
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MONTH="${1:-}"
if [[ -z "$MONTH" ]]; then
  MONTH="$(date -u -v-1m +%Y-%m 2>/dev/null || date -u -d 'last month' +%Y-%m)"
fi
if [[ ! "$MONTH" =~ ^[0-9]{4}-[0-9]{2}$ ]]; then
  echo "Month must be YYYY-MM (got: $MONTH)" >&2
  exit 1
fi

MONTH_START="${MONTH}-01"
# First day of next month
YEAR="${MONTH%-*}"
MON="${MONTH#*-}"
if [[ "$MON" == "12" ]]; then
  NEXT_START="$((YEAR + 1))-01-01"
else
  NEXT_MON=$(printf "%02d" $((10#$MON + 1)))
  NEXT_START="${YEAR}-${NEXT_MON}-01"
fi

APPLY="${APPLY:-0}"

if [[ -f "$ROOT_DIR/scripts/.db-sync.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT_DIR/scripts/.db-sync.env"
  set +a
fi

# Prefer DATABASE_URL from apps/api/.env when present (prod / local API).
if [[ -f "$ROOT_DIR/apps/api/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "$ROOT_DIR/apps/api/.env"
  set +a
fi

DB_URL="${DATABASE_URL:-${LOCAL_DATABASE_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo "Set DATABASE_URL or LOCAL_DATABASE_URL" >&2
  exit 1
fi
# Strip Prisma ?schema=
DB_URL="${DB_URL%%\?*}"

echo "Month: $MONTH ($MONTH_START .. < $NEXT_START)"
echo "Mode: $([[ "$APPLY" == "1" ]] && echo APPLY || echo DRY-RUN)"
echo

psql "$DB_URL" -v ON_ERROR_STOP=1 <<SQL
\\echo '=== August-style open arrears vs payments (active tenants) ==='
WITH month_arrears AS (
  SELECT
    a.id AS arrear_id,
    a.tenant_id,
    t.full_name,
    u.unit_number,
    u.rent_amount,
    a.amount_due,
    a.amount_paid,
    GREATEST(0, a.amount_due - a.amount_paid) AS balance,
    a.status
  FROM arrears a
  JOIN tenants t ON t.id = a.tenant_id AND t."organizationId" = a."organizationId"
  LEFT JOIN units u ON u.id = t.unit_id AND u."organizationId" = t."organizationId"
  WHERE a.month >= DATE '${MONTH_START}'
    AND a.month < DATE '${NEXT_START}'
    AND LOWER(COALESCE(t.status, '')) = 'active'
    AND LOWER(COALESCE(a.status, '')) IN ('pending', 'partial')
),
payments_in_month AS (
  SELECT
    p.tenant_id,
    COALESCE(SUM(p.amount), 0) AS paid_in_month
  FROM payments p
  WHERE p.payment_date >= DATE '${MONTH_START}'
    AND p.payment_date < DATE '${NEXT_START}'
  GROUP BY p.tenant_id
)
SELECT
  m.full_name,
  m.unit_number,
  m.rent_amount::numeric AS unit_rent,
  m.amount_due::numeric AS arrear_due,
  m.amount_paid::numeric AS arrear_paid,
  m.balance::numeric AS arrear_balance,
  COALESCE(p.paid_in_month, 0)::numeric AS payments_in_month,
  CASE
    WHEN COALESCE(p.paid_in_month, 0) >= m.amount_due THEN 'SHOULD_CLEAR'
    WHEN COALESCE(p.paid_in_month, 0) >= m.rent_amount THEN 'SHOULD_CLEAR_BY_RENT'
    WHEN COALESCE(p.paid_in_month, 0) > 0 THEN 'PARTIAL'
    ELSE 'NO_PAYMENT'
  END AS action
FROM month_arrears m
LEFT JOIN payments_in_month p ON p.tenant_id = m.tenant_id
ORDER BY action, m.full_name;

\\echo
\\echo '=== Summary ==='
WITH month_arrears AS (
  SELECT
    a.id,
    a.tenant_id,
    a.amount_due,
    a.amount_paid,
    u.rent_amount
  FROM arrears a
  JOIN tenants t ON t.id = a.tenant_id AND t."organizationId" = a."organizationId"
  LEFT JOIN units u ON u.id = t.unit_id AND u."organizationId" = t."organizationId"
  WHERE a.month >= DATE '${MONTH_START}'
    AND a.month < DATE '${NEXT_START}'
    AND LOWER(COALESCE(t.status, '')) = 'active'
    AND LOWER(COALESCE(a.status, '')) IN ('pending', 'partial')
),
payments_in_month AS (
  SELECT p.tenant_id, COALESCE(SUM(p.amount), 0) AS paid_in_month
  FROM payments p
  WHERE p.payment_date >= DATE '${MONTH_START}'
    AND p.payment_date < DATE '${NEXT_START}'
  GROUP BY p.tenant_id
)
SELECT
  COUNT(*) AS open_rows,
  COUNT(*) FILTER (
    WHERE COALESCE(p.paid_in_month, 0) >= GREATEST(m.amount_due, COALESCE(m.rent_amount, 0))
  ) AS will_clear,
  COUNT(*) FILTER (
    WHERE COALESCE(p.paid_in_month, 0) < GREATEST(m.amount_due, COALESCE(m.rent_amount, 0))
  ) AS remain_open,
  COALESCE(SUM(GREATEST(0, m.amount_due - m.amount_paid)), 0)::numeric AS open_balance
FROM month_arrears m
LEFT JOIN payments_in_month p ON p.tenant_id = m.tenant_id;
SQL

if [[ "$APPLY" != "1" ]]; then
  echo
  echo "Dry-run only. To apply clears for tenants whose payments cover rent/due:"
  echo "  APPLY=1 bash scripts/reconcile-month-arrears.sh $MONTH"
  echo
  echo "If every active tenant paid (force-clear all open $MONTH arrears):"
  echo "  APPLY=1 FORCE=1 bash scripts/reconcile-month-arrears.sh $MONTH"
  exit 0
fi

echo
if [[ "${FORCE:-0}" == "1" ]]; then
  echo "FORCE=1 — clearing ALL open $MONTH arrears for active tenants..."
  psql "$DB_URL" -v ON_ERROR_STOP=1 <<SQL
UPDATE arrears a
SET
  amount_paid = a.amount_due,
  status = 'cleared',
  updated_at = NOW()
FROM tenants t
WHERE t.id = a.tenant_id
  AND t."organizationId" = a."organizationId"
  AND a.month >= DATE '${MONTH_START}'
  AND a.month < DATE '${NEXT_START}'
  AND LOWER(COALESCE(t.status, '')) = 'active'
  AND LOWER(COALESCE(a.status, '')) IN ('pending', 'partial')
RETURNING a.id, a.tenant_id, a.amount_due, a.amount_paid, a.status;
SQL
else
  echo "Applying clears where payments in $MONTH cover rent/due..."
  psql "$DB_URL" -v ON_ERROR_STOP=1 <<SQL
WITH payments_in_month AS (
  SELECT p.tenant_id, COALESCE(SUM(p.amount), 0) AS paid_in_month
  FROM payments p
  WHERE p.payment_date >= DATE '${MONTH_START}'
    AND p.payment_date < DATE '${NEXT_START}'
  GROUP BY p.tenant_id
),
to_clear AS (
  SELECT
    a.id,
    a.amount_due,
    GREATEST(a.amount_due, COALESCE(u.rent_amount, 0)) AS cover_target,
    COALESCE(p.paid_in_month, 0) AS paid_in_month
  FROM arrears a
  JOIN tenants t ON t.id = a.tenant_id AND t."organizationId" = a."organizationId"
  LEFT JOIN units u ON u.id = t.unit_id AND u."organizationId" = t."organizationId"
  LEFT JOIN payments_in_month p ON p.tenant_id = a.tenant_id
  WHERE a.month >= DATE '${MONTH_START}'
    AND a.month < DATE '${NEXT_START}'
    AND LOWER(COALESCE(t.status, '')) = 'active'
    AND LOWER(COALESCE(a.status, '')) IN ('pending', 'partial')
    AND COALESCE(p.paid_in_month, 0) >= GREATEST(a.amount_due, COALESCE(u.rent_amount, 0))
)
UPDATE arrears a
SET
  amount_paid = a.amount_due,
  status = 'cleared',
  updated_at = NOW()
FROM to_clear c
WHERE a.id = c.id
RETURNING a.id, a.tenant_id, a.amount_due, a.amount_paid, a.status;
SQL
fi

echo "Done. Re-check reports for $MONTH."
