ALTER TABLE "maintenance_requests"
  ADD COLUMN "tenant_id" TEXT;

CREATE INDEX "maintenance_requests_tenant_id_idx"
  ON "maintenance_requests"("tenant_id");

ALTER TABLE "maintenance_requests"
  ADD CONSTRAINT "maintenance_requests_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
