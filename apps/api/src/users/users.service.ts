import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** All memberships in the org, joined with user + custom role + permissions. */
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
      role: m.role, // MembershipRole enum (OWNER/ADMIN/...)
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

  /** Assign (or clear) a custom role on a user's membership in this org. */
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
      data: { roleId },
    });
  }

  /**
   * Remove the user's membership in this organization. Doesn't touch the
   * global User record — they can still exist as a member of other orgs.
   */
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
