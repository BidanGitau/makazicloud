-- Align arrears with the application billing model while preserving the
-- existing multi-tenant text/cuid ids used by this project.

ALTER TABLE "arrears"
  ADD COLUMN IF NOT EXISTS "due_date" DATE;

UPDATE "arrears"
SET "due_date" = "month"
WHERE "due_date" IS NULL;

-- Remove duplicate rows before adding the tenant/month unique constraint.
-- Keep the newest row, preferring rows with higher paid amounts.
DELETE FROM "arrears" a
USING "arrears" b
WHERE a."tenant_id" = b."tenant_id"
  AND a."month" = b."month"
  AND (
    a."updated_at" < b."updated_at"
    OR (
      a."updated_at" = b."updated_at"
      AND a."amount_paid" <= b."amount_paid"
      AND a."id" < b."id"
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS "arrears_unique_tenant_month"
  ON "arrears" ("tenant_id", "month");

CREATE INDEX IF NOT EXISTS "idx_arrears_tenant_month"
  ON "arrears" ("tenant_id", "month");

CREATE INDEX IF NOT EXISTS "idx_arrears_status"
  ON "arrears" ("status");

CREATE INDEX IF NOT EXISTS "idx_arrears_tenant_id"
  ON "arrears" ("tenant_id");

ALTER TABLE "arrears"
  DROP CONSTRAINT IF EXISTS "arrears_status_check";

ALTER TABLE "arrears"
  ADD CONSTRAINT "arrears_status_check"
  CHECK ("status" IN ('pending', 'partial', 'cleared', 'prepaid'));
