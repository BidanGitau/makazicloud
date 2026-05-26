


CREATE UNIQUE INDEX IF NOT EXISTS "tenants_org_email_lower_unique"
  ON "tenants" ("organizationId", LOWER("email"))
  WHERE "email" IS NOT NULL AND "email" <> '';
