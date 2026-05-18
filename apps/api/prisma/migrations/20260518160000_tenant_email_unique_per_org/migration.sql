-- Per-organization tenant email uniqueness (case-insensitive).
--
-- Under the relaxed multi-org tenancy model, the same email may appear
-- on tenant rows in different organizations (a person renting at two
-- unrelated properties). But within ONE organization, an email can sit
-- on at most one tenant row — accidental duplicates would split rent
-- ledgers and break per-tenant operations.
--
-- The index is partial (email IS NOT NULL AND length > 0) so tenants
-- without an email on file aren't forced into a fake collision.

CREATE UNIQUE INDEX IF NOT EXISTS "tenants_org_email_lower_unique"
  ON "tenants" ("organizationId", LOWER("email"))
  WHERE "email" IS NOT NULL AND "email" <> '';
