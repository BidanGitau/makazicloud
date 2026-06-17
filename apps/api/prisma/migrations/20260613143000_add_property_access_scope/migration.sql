CREATE TYPE "PropertyAccessScope" AS ENUM ('ALL', 'SELECTED');

ALTER TABLE "Membership"
  ADD COLUMN "property_access_scope" "PropertyAccessScope" NOT NULL DEFAULT 'ALL';

ALTER TABLE "invitations"
  ADD COLUMN "property_access_scope" "PropertyAccessScope" NOT NULL DEFAULT 'ALL';

CREATE TABLE "membership_property_access" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "membership_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "membership_property_access_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invitation_property_access" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "invitation_id" TEXT NOT NULL,
  "property_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invitation_property_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "membership_property_access_membership_id_property_id_key"
  ON "membership_property_access"("membership_id", "property_id");
CREATE INDEX "membership_property_access_organizationId_idx"
  ON "membership_property_access"("organizationId");
CREATE INDEX "membership_property_access_membership_id_idx"
  ON "membership_property_access"("membership_id");
CREATE INDEX "membership_property_access_property_id_organizationId_idx"
  ON "membership_property_access"("property_id", "organizationId");

CREATE UNIQUE INDEX "invitation_property_access_invitation_id_property_id_key"
  ON "invitation_property_access"("invitation_id", "property_id");
CREATE INDEX "invitation_property_access_organizationId_idx"
  ON "invitation_property_access"("organizationId");
CREATE INDEX "invitation_property_access_invitation_id_idx"
  ON "invitation_property_access"("invitation_id");
CREATE INDEX "invitation_property_access_property_id_organizationId_idx"
  ON "invitation_property_access"("property_id", "organizationId");

CREATE INDEX "Membership_property_access_scope_idx"
  ON "Membership"("property_access_scope");
CREATE INDEX "invitations_property_access_scope_idx"
  ON "invitations"("property_access_scope");

ALTER TABLE "membership_property_access"
  ADD CONSTRAINT "membership_property_access_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_property_access"
  ADD CONSTRAINT "membership_property_access_membership_id_fkey"
  FOREIGN KEY ("membership_id") REFERENCES "Membership"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "membership_property_access"
  ADD CONSTRAINT "membership_property_access_property_id_organizationId_fkey"
  FOREIGN KEY ("property_id", "organizationId") REFERENCES "properties"("id", "organizationId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitation_property_access"
  ADD CONSTRAINT "invitation_property_access_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitation_property_access"
  ADD CONSTRAINT "invitation_property_access_invitation_id_fkey"
  FOREIGN KEY ("invitation_id") REFERENCES "invitations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitation_property_access"
  ADD CONSTRAINT "invitation_property_access_property_id_organizationId_fkey"
  FOREIGN KEY ("property_id", "organizationId") REFERENCES "properties"("id", "organizationId")
  ON DELETE CASCADE ON UPDATE CASCADE;
