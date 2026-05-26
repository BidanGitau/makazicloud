import type { PrismaClient } from "@prisma/client";


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


export async function seedOrganizationRoles(
  prisma: PrismaClient | any,
  organizationId: string,
) {
  const run = async (tx: any) => {

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
