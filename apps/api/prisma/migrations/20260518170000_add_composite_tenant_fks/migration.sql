-- Tighten tenant-scoped relations so referenced rows must belong to the
-- same organization as the child row. These constraints turn accidental
-- cross-organization writes into database errors.

CREATE UNIQUE INDEX IF NOT EXISTS "blocks_id_organizationId_key"
  ON "blocks"("id", "organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "units_id_organizationId_key"
  ON "units"("id", "organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "utility_bills_id_organizationId_key"
  ON "utility_bills"("id", "organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_id_organizationId_key"
  ON "tenants"("id", "organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "payments_id_organizationId_key"
  ON "payments"("id", "organizationId");

CREATE INDEX IF NOT EXISTS "units_block_id_organizationId_idx"
  ON "units"("block_id", "organizationId");

CREATE INDEX IF NOT EXISTS "utility_unit_assignments_unit_id_organizationId_idx"
  ON "utility_unit_assignments"("unit_id", "organizationId");

CREATE INDEX IF NOT EXISTS "utility_meter_readings_unit_id_organizationId_idx"
  ON "utility_meter_readings"("unit_id", "organizationId");

CREATE INDEX IF NOT EXISTS "utility_meter_readings_bill_id_organizationId_idx"
  ON "utility_meter_readings"("bill_id", "organizationId");

CREATE INDEX IF NOT EXISTS "utility_bills_block_id_organizationId_idx"
  ON "utility_bills"("block_id", "organizationId");

CREATE INDEX IF NOT EXISTS "utility_bills_unit_id_organizationId_idx"
  ON "utility_bills"("unit_id", "organizationId");

CREATE INDEX IF NOT EXISTS "tenants_unit_id_organizationId_idx"
  ON "tenants"("unit_id", "organizationId");

CREATE INDEX IF NOT EXISTS "tenant_portal_invitations_tenant_id_organizationId_idx"
  ON "tenant_portal_invitations"("tenant_id", "organizationId");

CREATE INDEX IF NOT EXISTS "payments_tenant_id_organizationId_idx"
  ON "payments"("tenant_id", "organizationId");

CREATE INDEX IF NOT EXISTS "payment_allocations_payment_id_organizationId_idx"
  ON "payment_allocations"("payment_id", "organizationId");

CREATE INDEX IF NOT EXISTS "payment_allocations_tenant_id_organizationId_idx"
  ON "payment_allocations"("tenant_id", "organizationId");

CREATE INDEX IF NOT EXISTS "arrears_tenant_id_organizationId_idx"
  ON "arrears"("tenant_id", "organizationId");

CREATE INDEX IF NOT EXISTS "maintenance_requests_tenant_id_organizationId_idx"
  ON "maintenance_requests"("tenant_id", "organizationId");

CREATE INDEX IF NOT EXISTS "refunds_tenant_id_organizationId_idx"
  ON "refunds"("tenant_id", "organizationId");

ALTER TABLE "units"
  DROP CONSTRAINT IF EXISTS "units_block_id_fkey",
  ADD CONSTRAINT "units_block_id_organizationId_fkey"
    FOREIGN KEY ("block_id", "organizationId")
    REFERENCES "blocks"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "utility_unit_assignments"
  DROP CONSTRAINT IF EXISTS "utility_unit_assignments_unit_id_fkey",
  ADD CONSTRAINT "utility_unit_assignments_unit_id_organizationId_fkey"
    FOREIGN KEY ("unit_id", "organizationId")
    REFERENCES "units"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "utility_meter_readings"
  DROP CONSTRAINT IF EXISTS "utility_meter_readings_unit_id_fkey",
  DROP CONSTRAINT IF EXISTS "utility_meter_readings_bill_id_fkey",
  ADD CONSTRAINT "utility_meter_readings_unit_id_organizationId_fkey"
    FOREIGN KEY ("unit_id", "organizationId")
    REFERENCES "units"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "utility_meter_readings_bill_id_organizationId_fkey"
    FOREIGN KEY ("bill_id", "organizationId")
    REFERENCES "utility_bills"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "utility_bills"
  DROP CONSTRAINT IF EXISTS "utility_bills_block_id_fkey",
  DROP CONSTRAINT IF EXISTS "utility_bills_unit_id_fkey",
  ADD CONSTRAINT "utility_bills_block_id_organizationId_fkey"
    FOREIGN KEY ("block_id", "organizationId")
    REFERENCES "blocks"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "utility_bills_unit_id_organizationId_fkey"
    FOREIGN KEY ("unit_id", "organizationId")
    REFERENCES "units"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenants"
  DROP CONSTRAINT IF EXISTS "tenants_unit_id_fkey",
  ADD CONSTRAINT "tenants_unit_id_organizationId_fkey"
    FOREIGN KEY ("unit_id", "organizationId")
    REFERENCES "units"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenant_portal_invitations"
  DROP CONSTRAINT IF EXISTS "tenant_portal_invitations_tenant_id_fkey",
  ADD CONSTRAINT "tenant_portal_invitations_tenant_id_organizationId_fkey"
    FOREIGN KEY ("tenant_id", "organizationId")
    REFERENCES "tenants"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payments"
  DROP CONSTRAINT IF EXISTS "payments_tenant_id_fkey",
  ADD CONSTRAINT "payments_tenant_id_organizationId_fkey"
    FOREIGN KEY ("tenant_id", "organizationId")
    REFERENCES "tenants"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_allocations"
  DROP CONSTRAINT IF EXISTS "payment_allocations_payment_id_fkey",
  DROP CONSTRAINT IF EXISTS "payment_allocations_tenant_id_fkey",
  ADD CONSTRAINT "payment_allocations_payment_id_organizationId_fkey"
    FOREIGN KEY ("payment_id", "organizationId")
    REFERENCES "payments"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "payment_allocations_tenant_id_organizationId_fkey"
    FOREIGN KEY ("tenant_id", "organizationId")
    REFERENCES "tenants"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "arrears"
  DROP CONSTRAINT IF EXISTS "arrears_tenant_id_fkey",
  ADD CONSTRAINT "arrears_tenant_id_organizationId_fkey"
    FOREIGN KEY ("tenant_id", "organizationId")
    REFERENCES "tenants"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "maintenance_requests"
  DROP CONSTRAINT IF EXISTS "maintenance_requests_tenant_id_fkey",
  ADD CONSTRAINT "maintenance_requests_tenant_id_organizationId_fkey"
    FOREIGN KEY ("tenant_id", "organizationId")
    REFERENCES "tenants"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "refunds"
  DROP CONSTRAINT IF EXISTS "refunds_tenant_id_fkey",
  ADD CONSTRAINT "refunds_tenant_id_organizationId_fkey"
    FOREIGN KEY ("tenant_id", "organizationId")
    REFERENCES "tenants"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;
