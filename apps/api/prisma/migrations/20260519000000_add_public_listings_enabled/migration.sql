


ALTER TABLE "Organization" ADD COLUMN "public_listings_enabled" BOOLEAN NOT NULL DEFAULT false;


CREATE INDEX "Organization_status_publicListingsEnabled_idx"
  ON "Organization"("status", "public_listings_enabled");
