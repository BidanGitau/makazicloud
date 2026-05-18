ALTER TABLE "maintenance_requests"
  ADD COLUMN "block_id" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN "estimated_cost" DECIMAL(12,2),
  ADD COLUMN "actual_cost" DECIMAL(12,2),
  ADD COLUMN "reported_date" DATE,
  ADD COLUMN "completed_date" DATE,
  ADD COLUMN "vendor_name" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "is_tenant_fault" BOOLEAN NOT NULL DEFAULT false;

UPDATE "maintenance_requests"
SET "actual_cost" = COALESCE("actual_cost", "amount")
WHERE "amount" IS NOT NULL;

CREATE INDEX "maintenance_requests_property_id_idx" ON "maintenance_requests"("property_id");
CREATE INDEX "maintenance_requests_block_id_idx" ON "maintenance_requests"("block_id");
CREATE INDEX "maintenance_requests_unit_id_idx" ON "maintenance_requests"("unit_id");
CREATE INDEX "maintenance_requests_status_idx" ON "maintenance_requests"("status");
