CREATE TABLE "organization_mpesa_configs" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "shortcode" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'production',
  "consumer_key_encrypted" TEXT,
  "consumer_secret_encrypted" TEXT,
  "passkey_encrypted" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "registered_at" TIMESTAMP(3),
  "last_callback_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "organization_mpesa_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organization_mpesa_configs_organizationId_key"
  ON "organization_mpesa_configs"("organizationId");

CREATE UNIQUE INDEX "organization_mpesa_configs_shortcode_key"
  ON "organization_mpesa_configs"("shortcode");

CREATE INDEX "organization_mpesa_configs_shortcode_idx"
  ON "organization_mpesa_configs"("shortcode");

CREATE INDEX "organization_mpesa_configs_organizationId_idx"
  ON "organization_mpesa_configs"("organizationId");

ALTER TABLE "organization_mpesa_configs"
  ADD CONSTRAINT "organization_mpesa_configs_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "Organization"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE TABLE "mpesa_transactions" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "shortcode" TEXT NOT NULL,
  "bill_ref_number" TEXT,
  "normalized_account" TEXT,
  "trans_id" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "phone_number" TEXT,
  "payer_first_name" TEXT,
  "payer_middle_name" TEXT,
  "payer_last_name" TEXT,
  "trans_time" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'unmatched',
  "match_reason" TEXT,
  "matched_tenant_id" TEXT,
  "payment_id" TEXT,
  "raw_payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "mpesa_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mpesa_transactions_trans_id_key"
  ON "mpesa_transactions"("trans_id");

CREATE INDEX "mpesa_transactions_organizationId_idx"
  ON "mpesa_transactions"("organizationId");

CREATE INDEX "mpesa_transactions_shortcode_idx"
  ON "mpesa_transactions"("shortcode");

CREATE INDEX "mpesa_transactions_normalized_account_idx"
  ON "mpesa_transactions"("normalized_account");

CREATE INDEX "mpesa_transactions_status_idx"
  ON "mpesa_transactions"("status");

ALTER TABLE "mpesa_transactions"
  ADD CONSTRAINT "mpesa_transactions_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "Organization"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
