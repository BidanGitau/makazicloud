CREATE TABLE "owner_settlements" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "close_month" DATE NOT NULL,
  "gross_collection" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "commission_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "maintenance_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "advances_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "owner_payout" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "payout_mode" TEXT NOT NULL,
  "payout_reference" TEXT NOT NULL,
  "notes" TEXT,
  "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "owner_settlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "owner_settlements_organizationId_property_id_close_month_key"
  ON "owner_settlements"("organizationId", "property_id", "close_month");

CREATE INDEX "owner_settlements_organizationId_idx"
  ON "owner_settlements"("organizationId");

CREATE INDEX "owner_settlements_property_id_organizationId_idx"
  ON "owner_settlements"("property_id", "organizationId");

CREATE INDEX "owner_settlements_close_month_idx"
  ON "owner_settlements"("close_month");

ALTER TABLE "owner_settlements"
  ADD CONSTRAINT "owner_settlements_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "Organization"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "owner_settlements"
  ADD CONSTRAINT "owner_settlements_property_id_organizationId_fkey"
  FOREIGN KEY ("property_id", "organizationId")
  REFERENCES "properties"("id", "organizationId")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
