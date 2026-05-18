ALTER TABLE "Organization"
  ADD COLUMN "subscription_plan" TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN "subscription_status" TEXT NOT NULL DEFAULT 'trialing',
  ADD COLUMN "trial_ends_at" TIMESTAMP(3),
  ADD COLUMN "subscription_ends_at" TIMESTAMP(3);

UPDATE "Organization"
SET "trial_ends_at" = COALESCE("trial_ends_at", "createdAt" + INTERVAL '30 days');

CREATE INDEX "Organization_subscription_plan_idx" ON "Organization"("subscription_plan");
CREATE INDEX "Organization_subscription_status_idx" ON "Organization"("subscription_status");
