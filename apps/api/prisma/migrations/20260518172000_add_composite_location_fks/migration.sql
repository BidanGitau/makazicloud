-- Close the remaining cross-org write gaps flagged by the multitenancy
-- audit: MaintenanceRequest.{property,block,unit}, OwnerAdvance.property,
-- Refund.unit had no FK at all, so a buggy/admin write could attach a
-- row to another org's location. Same composite-FK pattern as the
-- earlier tenant/payment migration: (id, organizationId) on both sides.

CREATE INDEX IF NOT EXISTS "maintenance_requests_property_id_organizationId_idx"
  ON "maintenance_requests"("property_id", "organizationId");

CREATE INDEX IF NOT EXISTS "maintenance_requests_block_id_organizationId_idx"
  ON "maintenance_requests"("block_id", "organizationId");

CREATE INDEX IF NOT EXISTS "maintenance_requests_unit_id_organizationId_idx"
  ON "maintenance_requests"("unit_id", "organizationId");

CREATE INDEX IF NOT EXISTS "owner_advances_property_id_organizationId_idx"
  ON "owner_advances"("property_id", "organizationId");

CREATE INDEX IF NOT EXISTS "refunds_unit_id_organizationId_idx"
  ON "refunds"("unit_id", "organizationId");

ALTER TABLE "maintenance_requests"
  ADD CONSTRAINT "maintenance_requests_property_id_organizationId_fkey"
    FOREIGN KEY ("property_id", "organizationId")
    REFERENCES "properties"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "maintenance_requests_block_id_organizationId_fkey"
    FOREIGN KEY ("block_id", "organizationId")
    REFERENCES "blocks"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "maintenance_requests_unit_id_organizationId_fkey"
    FOREIGN KEY ("unit_id", "organizationId")
    REFERENCES "units"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "owner_advances"
  ADD CONSTRAINT "owner_advances_property_id_organizationId_fkey"
    FOREIGN KEY ("property_id", "organizationId")
    REFERENCES "properties"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_unit_id_organizationId_fkey"
    FOREIGN KEY ("unit_id", "organizationId")
    REFERENCES "units"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;
