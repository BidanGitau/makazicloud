-- Payments are cancelled (voided) instead of deleted so the ledger keeps an audit trail.
ALTER TABLE "payments"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "voided_at" TIMESTAMP(3),
  ADD COLUMN "voided_by_id" TEXT,
  ADD COLUMN "void_reason" TEXT;

CREATE INDEX "payments_organizationId_status_idx" ON "payments"("organizationId", "status");
