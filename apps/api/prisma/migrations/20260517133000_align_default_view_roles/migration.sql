-- Keep built-in Viewer/Manager roles aligned with the main workspace windows.
-- Viewer sees the same modules read-only; Manager sees the same modules with
-- selected operational write permissions.

WITH target_permissions(role_name, permission_name) AS (
  VALUES
    ('Viewer', 'dashboard:view'),
    ('Viewer', 'properties:view'),
    ('Viewer', 'units:view'),
    ('Viewer', 'tenants:view'),
    ('Viewer', 'payments:view'),
    ('Viewer', 'arrears:view'),
    ('Viewer', 'reports:view'),
    ('Viewer', 'maintenance:view'),
    ('Viewer', 'utilities:view'),
    ('Viewer', 'settings:view'),
    ('Manager', 'dashboard:view'),
    ('Manager', 'properties:view'),
    ('Manager', 'properties:edit'),
    ('Manager', 'units:view'),
    ('Manager', 'units:create'),
    ('Manager', 'units:edit'),
    ('Manager', 'tenants:view'),
    ('Manager', 'tenants:create'),
    ('Manager', 'tenants:edit'),
    ('Manager', 'payments:view'),
    ('Manager', 'payments:create'),
    ('Manager', 'arrears:view'),
    ('Manager', 'arrears:manage'),
    ('Manager', 'reports:view'),
    ('Manager', 'reports:export'),
    ('Manager', 'maintenance:view'),
    ('Manager', 'maintenance:create'),
    ('Manager', 'maintenance:edit'),
    ('Manager', 'utilities:view'),
    ('Manager', 'settings:view')
),
built_in_roles AS (
  SELECT id, "organizationId", name
  FROM roles
  WHERE name IN ('Viewer', 'Manager')
),
delete_old AS (
  DELETE FROM role_permissions rp
  USING built_in_roles bir
  WHERE rp.role_id = bir.id
  RETURNING rp.id
)
INSERT INTO role_permissions (id, "organizationId", role_id, permission_id)
SELECT
  'rp_' || md5(bir.id || ':' || p.id),
  bir."organizationId",
  bir.id,
  p.id
FROM built_in_roles bir
JOIN target_permissions tp ON tp.role_name = bir.name
JOIN permissions p
  ON p."organizationId" = bir."organizationId"
 AND p.name = tp.permission_name
ON CONFLICT DO NOTHING;
