-- Enforce one User row per email address, case-insensitively.
--
-- The column-level @unique on "User"."email" already prevents exact
-- duplicates ("alice@x.com" twice). It does NOT prevent case-variant
-- duplicates ("alice@x.com" + "Alice@x.com"). Every application code
-- path normalizes to lowercase before insert, but a single bypass
-- (raw SQL, future migration, future code path) could split a person
-- across two rows.
--
-- The fix: a UNIQUE INDEX on LOWER(email). Postgres rejects any insert
-- whose lower(email) collides with an existing row, regardless of how
-- the new row was written. Existing @unique stays as a belt-and-braces
-- guard against exact dupes.

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_lower_unique"
  ON "User" (LOWER("email"));
