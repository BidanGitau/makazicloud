ALTER TABLE "utility_bills"
  ADD COLUMN IF NOT EXISTS "include_with_rent" BOOLEAN NOT NULL DEFAULT true;
