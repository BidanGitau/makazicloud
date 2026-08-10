CREATE TABLE "auth_audit_logs" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT,
  "user_id" TEXT,
  "email" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "reason" TEXT,
  "role" TEXT,
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_audit_logs_organization_id_idx"
  ON "auth_audit_logs"("organization_id");

CREATE INDEX "auth_audit_logs_user_id_idx"
  ON "auth_audit_logs"("user_id");

CREATE INDEX "auth_audit_logs_email_idx"
  ON "auth_audit_logs"("email");

CREATE INDEX "auth_audit_logs_success_idx"
  ON "auth_audit_logs"("success");

CREATE INDEX "auth_audit_logs_created_at_idx"
  ON "auth_audit_logs"("created_at");

ALTER TABLE "auth_audit_logs"
  ADD CONSTRAINT "auth_audit_logs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_audit_logs"
  ADD CONSTRAINT "auth_audit_logs_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
