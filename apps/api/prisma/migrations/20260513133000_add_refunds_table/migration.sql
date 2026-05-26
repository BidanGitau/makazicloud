
CREATE TABLE IF NOT EXISTS "refunds" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "lease_end_date" DATE,
    "amount_refunded" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);


CREATE INDEX IF NOT EXISTS "refunds_organizationId_idx" ON "refunds"("organizationId");


CREATE INDEX IF NOT EXISTS "refunds_tenant_id_idx" ON "refunds"("tenant_id");


CREATE UNIQUE INDEX IF NOT EXISTS "refunds_organizationId_tenant_id_key" ON "refunds"("organizationId", "tenant_id");


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'refunds_organizationId_fkey'
    ) THEN
        ALTER TABLE "refunds" ADD CONSTRAINT "refunds_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'refunds_tenant_id_fkey'
    ) THEN
        ALTER TABLE "refunds" ADD CONSTRAINT "refunds_tenant_id_fkey"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
