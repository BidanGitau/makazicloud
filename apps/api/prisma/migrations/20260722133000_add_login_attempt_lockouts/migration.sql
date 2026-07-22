CREATE TABLE "login_attempt_lockouts" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMP(3),
  "last_failed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "login_attempt_lockouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "login_attempt_lockouts_email_key" ON "login_attempt_lockouts"("email");
CREATE INDEX "login_attempt_lockouts_email_idx" ON "login_attempt_lockouts"("email");
CREATE INDEX "login_attempt_lockouts_locked_until_idx" ON "login_attempt_lockouts"("locked_until");
