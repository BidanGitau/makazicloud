ALTER TABLE "owner_advances"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'disbursed';
