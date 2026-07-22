CREATE TABLE "organization_sms_configs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'emalify',
    "partner_id_encrypted" TEXT,
    "api_key_encrypted" TEXT,
    "sender_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_balance_check_at" TIMESTAMP(3),
    "last_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_sms_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_addons" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "addon_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_addons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_sms_configs_organizationId_key"
ON "organization_sms_configs"("organizationId");

CREATE INDEX "organization_sms_configs_organizationId_idx"
ON "organization_sms_configs"("organizationId");

CREATE INDEX "organization_sms_configs_provider_idx"
ON "organization_sms_configs"("provider");

CREATE UNIQUE INDEX "organization_addons_organizationId_addon_key_key"
ON "organization_addons"("organizationId", "addon_key");

CREATE INDEX "organization_addons_organizationId_idx"
ON "organization_addons"("organizationId");

CREATE INDEX "organization_addons_addon_key_idx"
ON "organization_addons"("addon_key");

CREATE INDEX "organization_addons_organizationId_enabled_idx"
ON "organization_addons"("organizationId", "enabled");

ALTER TABLE "organization_sms_configs"
ADD CONSTRAINT "organization_sms_configs_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_addons"
ADD CONSTRAINT "organization_addons_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
