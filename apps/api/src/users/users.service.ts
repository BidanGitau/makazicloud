import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}


  async list(tenant: TenantContext) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId: tenant.organizationId },
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true } },
        customRole: {
          include: {
            permissions: {
              include: { permission: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => ({
      id: m.userId,
      membershipId: m.id,
      email: m.user.email,
      full_name: m.user.name,
      created_at: m.user.createdAt,
      role: m.role,
      role_id: m.roleId,
      roles: m.customRole
        ? {
            id: m.customRole.id,
            name: m.customRole.name,
            description: m.customRole.description,
            permissions: m.customRole.permissions.map((rp) => rp.permission),
          }
        : null,
    }));
  }


  async assignRole(tenant: TenantContext, userId: string, roleId: string | null) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: tenant.organizationId, userId },
    });
    if (!membership) throw new NotFoundException("Membership not found");

    if (roleId) {
      const role = await this.prisma.role.findFirst({
        where: { id: roleId, organizationId: tenant.organizationId },
        select: { id: true },
      });
      if (!role) throw new NotFoundException("Role not found");
    }

    return this.prisma.membership.update({
      where: { id: membership.id },
      data: {
        role: membership.role === "OWNER" ? "OWNER" : "VIEWER",
        roleId,
      },
    });
  }


  async remove(tenant: TenantContext, userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: tenant.organizationId, userId },
    });
    if (!membership) throw new NotFoundException("Membership not found");
    if (membership.role === "OWNER") {
      throw new NotFoundException("The owner of an organization cannot be removed");
    }
    await this.prisma.membership.delete({ where: { id: membership.id } });
    return { success: true };
  }
}
