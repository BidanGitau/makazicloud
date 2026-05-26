

CREATE UNIQUE INDEX IF NOT EXISTS "roles_id_organizationId_key"
  ON "roles"("id", "organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "permissions_id_organizationId_key"
  ON "permissions"("id", "organizationId");

CREATE INDEX IF NOT EXISTS "Membership_role_id_organizationId_idx"
  ON "Membership"("role_id", "organizationId");

CREATE INDEX IF NOT EXISTS "invitations_role_id_organizationId_idx"
  ON "invitations"("role_id", "organizationId");

CREATE INDEX IF NOT EXISTS "role_permissions_role_id_organizationId_idx"
  ON "role_permissions"("role_id", "organizationId");

CREATE INDEX IF NOT EXISTS "role_permissions_permission_id_organizationId_idx"
  ON "role_permissions"("permission_id", "organizationId");

ALTER TABLE "Membership"
  DROP CONSTRAINT IF EXISTS "Membership_role_id_fkey",
  ADD CONSTRAINT "Membership_role_id_organizationId_fkey"
    FOREIGN KEY ("role_id", "organizationId")
    REFERENCES "roles"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invitations"
  DROP CONSTRAINT IF EXISTS "invitations_role_id_fkey",
  ADD CONSTRAINT "invitations_role_id_organizationId_fkey"
    FOREIGN KEY ("role_id", "organizationId")
    REFERENCES "roles"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
  DROP CONSTRAINT IF EXISTS "role_permissions_role_id_fkey",
  DROP CONSTRAINT IF EXISTS "role_permissions_permission_id_fkey",
  ADD CONSTRAINT "role_permissions_role_id_organizationId_fkey"
    FOREIGN KEY ("role_id", "organizationId")
    REFERENCES "roles"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "role_permissions_permission_id_organizationId_fkey"
    FOREIGN KEY ("permission_id", "organizationId")
    REFERENCES "permissions"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;
