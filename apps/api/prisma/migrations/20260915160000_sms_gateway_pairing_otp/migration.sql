ALTER TABLE "organization_mpesa_configs"
  ADD COLUMN IF NOT EXISTS "pairing_otp_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "pairing_otp_expires_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paired_device_name" TEXT,
  ADD COLUMN IF NOT EXISTS "paired_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_mpesa_configs_pairing_otp_hash_key"
  ON "organization_mpesa_configs"("pairing_otp_hash");
