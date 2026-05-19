-- Owner-controlled gate for the unauthenticated /public/properties feed.
-- Defaults to false so existing orgs are not silently exposed; enable per
-- org from settings when they intend their listings to appear publicly.
ALTER TABLE "Organization" ADD COLUMN "public_listings_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Composite index for the public listings query path which always filters
-- by both columns. Postgres can use a single index scan for the WHERE.
CREATE INDEX "Organization_status_publicListingsEnabled_idx"
  ON "Organization"("status", "public_listings_enabled");
