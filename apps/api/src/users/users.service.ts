import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}


  async list(tenant: TenantContext) {
    const [memberships, invitations] = await Promise.all([
      this.prisma.membership.findMany({
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
      }),
      this.prisma.invitation.findMany({
        where: {
          organizationId: tenant.organizationId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: { select: { id: true, name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const members = memberships.map((m) => ({
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

    const pendingInvites = invitations.map((invite) => ({
      id: `invite:${invite.id}`,
      invitation_id: invite.id,
      email: invite.email,
      full_name: invite.fullName,
      created_at: invite.createdAt,
      expires_at: invite.expiresAt,
      role: "VIEWER",
      role_id: invite.roleId,
      invite_pending: true,
      invite_link: this.inviteLink(invite.token),
      roles: invite.role
        ? {
            id: invite.role.id,
            name: invite.role.name,
            description: invite.role.description,
            permissions: invite.role.permissions.map((rp) => rp.permission),
          }
        : null,
    }));

    return [...pendingInvites, ...members];
  }


  async assignRole(tenant: TenantContext, userId: string, roleId: string | null) {
    const membership = await this.prisma.membership.findFirst({
      where: { organizationId: tenant.organizationId, userId },
    });
    if (!membership) throw new NotFoundException("Membership not found");
    if (membership.role === "OWNER") {
      throw new ForbiddenException("The account owner role cannot be changed");
    }

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
        role: "VIEWER",
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
      throw new ForbiddenException("The account owner cannot be removed");
    }
    await this.prisma.membership.delete({ where: { id: membership.id } });
    return { success: true };
  }

  async revokeInvitation(tenant: TenantContext, invitationId: string) {
    const result = await this.prisma.invitation.deleteMany({
      where: {
        id: invitationId,
        organizationId: tenant.organizationId,
        acceptedAt: null,
      },
    });
    if (result.count === 0) {
      throw new NotFoundException("Pending invitation not found");
    }
    return { success: true };
  }

  private inviteLink(token: string) {
    const url = process.env.APP_BASE_URL || process.env.WEB_APP_URL;
    const baseUrl =
      url?.replace(/\/+$/, "") ||
      ((process.env.NODE_ENV || "development") === "development"
        ? "http://localhost:5173"
        : "");
    return baseUrl ? `${baseUrl}/accept-invite?token=${token}` : "";
  }
}
