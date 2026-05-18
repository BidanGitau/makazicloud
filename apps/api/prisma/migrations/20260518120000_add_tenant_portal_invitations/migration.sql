ALTER TABLE "tenants"
  ADD CONSTRAINT "tenants_user_id_fkey"
  FOREIGN KEY ("user_id")
  REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "tenants_user_id_idx" ON "tenants"("user_id");

CREATE TABLE "tenant_portal_invitations" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "created_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tenant_portal_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_portal_invitations_token_hash_key"
  ON "tenant_portal_invitations"("token_hash");

CREATE INDEX "tenant_portal_invitations_organizationId_idx"
  ON "tenant_portal_invitations"("organizationId");

CREATE INDEX "tenant_portal_invitations_tenant_id_idx"
  ON "tenant_portal_invitations"("tenant_id");

CREATE INDEX "tenant_portal_invitations_email_idx"
  ON "tenant_portal_invitations"("email");

ALTER TABLE "tenant_portal_invitations"
  ADD CONSTRAINT "tenant_portal_invitations_organizationId_fkey"
  FOREIGN KEY ("organizationId")
  REFERENCES "Organization"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "tenant_portal_invitations"
  ADD CONSTRAINT "tenant_portal_invitations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id")
  REFERENCES "tenants"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
