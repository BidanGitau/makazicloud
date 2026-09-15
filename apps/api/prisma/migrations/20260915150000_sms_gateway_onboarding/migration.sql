ALTER TABLE "organization_mpesa_configs"
  ADD COLUMN IF NOT EXISTS "account_type" TEXT NOT NULL DEFAULT 'paybill',
  ADD COLUMN IF NOT EXISTS "listener_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "store_owner_name" TEXT;
