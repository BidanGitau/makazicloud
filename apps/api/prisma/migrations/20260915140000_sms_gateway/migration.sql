ALTER TABLE "organization_mpesa_configs"
  ADD COLUMN "sms_gateway_token_hash" TEXT,
  ADD COLUMN "sms_gateway_last_at" TIMESTAMP(3);

ALTER TABLE "mpesa_transactions"
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'c2b',
  ADD COLUMN "raw_sms" TEXT;

CREATE INDEX "mpesa_transactions_source_idx" ON "mpesa_transactions"("source");
