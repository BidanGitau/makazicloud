-- Owner phone for disbursement SMS briefs
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "owner_phone" TEXT;
