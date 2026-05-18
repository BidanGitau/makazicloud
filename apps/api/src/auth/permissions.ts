import type { PrismaClient } from "@prisma/client";

// Canonical catalog of permissions every organization gets seeded with.
// Adding a new permission here means it appears in the org's catalog the
// next time the seeder runs (e.g. on a fresh signup or via a backfill).
export const DEFAULT_PERMISSIONS = [
  "dashboard:view",
  "properties:view", "properties:create", "properties:edit", "properties:delete",
  "units:view", "units:create", "units:edit", "units:delete",
  "tenants:view", "tenants:create", "tenants:edit", "tenants:delete",
  "payments:view", "payments:create", "payments:edit", "payments:delete",
  "arrears:view", "arrears:manage",
  "reports:view", "reports:export",
  "maintenance:view", "maintenance:create", "maintenance:edit", "maintenance:delete",
  "utilities:view", "utilities:manage",
  "settings:view", "settings:manage",
  "users:view", "users:create", "users:edit", "users:delete",
  "roles:view", "roles:manage",
] as const;

export type PermissionName = (typeof DEFAULT_PERMISSIONS)[number];

interface RoleDefinition {
  name: string;
  description: string;
  permissions: readonly PermissionName[];
}

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: "Admin",
    description: "Full access to everything.",
    permissions: DEFAULT_PERMISSIONS,
  },
  {
    name: "Manager",
    description: "Day-to-day operations: properties, tenants, payments, reports.",
    permissions: [
      "dashboard:view",
      "properties:view", "properties:edit",
      "units:view", "units:create", "units:edit",
      "tenants:view", "tenants:create", "tenants:edit",
      "payments:view", "payments:create",
      "arrears:view", "arrears:manage",
      "reports:view", "reports:export",
      "maintenance:view", "maintenance:create", "maintenance:edit",
      "utilities:view",
      "settings:view",
    ],
  },
  {
    name: "Assistant",
    description: "Front-desk: record payments and log maintenance.",
    permissions: [
      "dashboard:view", "properties:view", "units:view",
      "tenants:view", "payments:view", "payments:create",
      "arrears:view", "reports:view",
      "maintenance:view", "maintenance:create",
    ],
  },
  {
    name: "Viewer",
    description: "Read-only access to all main workspace modules.",
    permissions: [
      "dashboard:view", "properties:view", "units:view",
      "tenants:view", "payments:view", "arrears:view", "reports:view",
      "maintenance:view", "utilities:view", "settings:view",
    ],
  },
];

const ADMIN_ROLE_NAME = "Admin";

/**
 * Seed the catalog of permissions + default roles for an organization.
 * Idempotent — safe to call repeatedly. Returns the Admin role so the
 * caller can assign it to the org owner.
 *
 * Pass an existing transaction client (`tx`) when calling from within an
 * outer transaction; otherwise the function opens its own.
 */
export async function seedOrganizationRoles(
  prisma: PrismaClient | any,
  organizationId: string,
) {
  const run = async (tx: any) => {
    // 1. Permission catalog
    for (const name of DEFAULT_PERMISSIONS) {
      await tx.permission.upsert({
        where: { organizationId_name: { organizationId, name } },
        create: { organizationId, name },
        update: {},
      });
    }
    const allPerms = await tx.permission.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });
    const permByName = new Map<string, string>(
      allPerms.map((p: { id: string; name: string }) => [p.name, p.id]),
    );

    // 2. Roles + their permission links (full replace each call → idempotent)
    let adminRoleId: string | null = null;
    for (const def of DEFAULT_ROLES) {
      const role = await tx.role.upsert({
        where: { organizationId_name: { organizationId, name: def.name } },
        create: {
          organizationId,
          name: def.name,
          description: def.description,
        },
        update: { description: def.description },
      });
      if (def.name === ADMIN_ROLE_NAME) adminRoleId = role.id;

      await tx.rolePermission.deleteMany({
        where: { roleId: role.id, organizationId },
      });
      const links = def.permissions
        .map((name) => permByName.get(name))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({
          organizationId,
          roleId: role.id,
          permissionId,
        }));
      if (links.length > 0) {
        await tx.rolePermission.createMany({ data: links, skipDuplicates: true });
      }
    }

    return adminRoleId;
  };

  if (typeof prisma.$transaction === "function") {
    return prisma.$transaction(run);
  }
  return run(prisma);
}

/**
 * Resolve the permission names a user can exercise. Owners get everything
 * regardless of custom role. Other members get their custom role's
 * permissions, falling back to an empty list if none is assigned.
 */
export async function resolveUserPermissions(
  prisma: PrismaClient | any,
  membership: { role: string; roleId: string | null; organizationId: string },
): Promise<string[]> {
  if (membership.role === "OWNER") {
    const perms = await prisma.permission.findMany({
      where: { organizationId: membership.organizationId },
      select: { name: true },
    });
    return perms.map((p: { name: string }) => p.name);
  }

  if (!membership.roleId) return [];

  const role = await prisma.role.findUnique({
    where: { id: membership.roleId },
    include: { permissions: { include: { permission: { select: { name: true } } } } },
  });
  if (!role) return [];
  return role.permissions.map(
    (rp: { permission: { name: string } }) => rp.permission.name,
  );
}
