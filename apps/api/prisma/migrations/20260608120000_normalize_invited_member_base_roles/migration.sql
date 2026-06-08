UPDATE "Membership"
SET "role" = 'VIEWER'
WHERE "role" <> 'OWNER'
  AND "role_id" IS NOT NULL;
