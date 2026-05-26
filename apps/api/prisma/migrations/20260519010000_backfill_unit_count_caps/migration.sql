


UPDATE "properties" p
SET "unit_count" = sub.actual
FROM (
  SELECT "property_id" AS id, COUNT(*)::int AS actual
  FROM "units"
  GROUP BY "property_id"
) sub
WHERE p."id" = sub.id
  AND p."unit_count" IS NOT NULL
  AND p."unit_count" < sub.actual;

UPDATE "blocks" b
SET "unit_count" = sub.actual
FROM (
  SELECT "block_id" AS id, COUNT(*)::int AS actual
  FROM "units"
  WHERE "block_id" IS NOT NULL
  GROUP BY "block_id"
) sub
WHERE b."id" = sub.id
  AND b."unit_count" IS NOT NULL
  AND b."unit_count" < sub.actual;
