-- Optional agency contact phone for tenant SMS (lease cancel, etc.)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "agency_phone" TEXT;
