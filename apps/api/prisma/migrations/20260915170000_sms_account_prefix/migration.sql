ALTER TABLE "organization_mpesa_configs"
  ADD COLUMN IF NOT EXISTS "sms_account_prefix" TEXT;
