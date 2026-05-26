import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenant: TenantContext) {
    const roles = await this.prisma.role.findMany({
      where: { organizationId: tenant.organizationId },
      include: {
        permissions: {
          include: { permission: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      created_at: r.createdAt,
      permissions: r.permissions.map((rp) => rp.permission),
    }));
  }

  async getById(tenant: TenantContext, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId: tenant.organizationId },
      include: {
        permissions: {
          include: { permission: { select: { id: true, name: true } } },
        },
      },
    });
    if (!role) throw new NotFoundException("Role not found");
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      created_at: role.createdAt,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  async create(
    tenant: TenantContext,
    input: { name: string; description?: string },
  ) {
    const name = input.name?.trim();
    if (!name) throw new BadRequestException("Role name is required");
    return this.prisma.role.create({
      data: {
        organizationId: tenant.organizationId,
        name,
        description: input.description?.trim() || null,
      },
    });
  }

  async update(
    tenant: TenantContext,
    id: string,
    input: { name?: string; description?: string },
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId: tenant.organizationId },
      select: { id: true },
    });
    if (!role) throw new NotFoundException("Role not found");

    return this.prisma.role.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
      },
    });
  }

  async remove(tenant: TenantContext, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, organizationId: tenant.organizationId },
      select: { id: true },
    });
    if (!role) throw new NotFoundException("Role not found");
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }


  async setPermissions(
    tenant: TenantContext,
    roleId: string,
    permissionIds: string[],
  ) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId: tenant.organizationId },
      select: { id: true },
    });
    if (!role) throw new NotFoundException("Role not found");


    const validPerms = await this.prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
        organizationId: tenant.organizationId,
      },
      select: { id: true },
    });
    const validIds = new Set(validPerms.map((p) => p.id));

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({
        where: { roleId, organizationId: tenant.organizationId },
      }),
      this.prisma.rolePermission.createMany({
        data: [...validIds].map((permissionId) => ({
          organizationId: tenant.organizationId,
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      }),
    ]);

    return this.getById(tenant, roleId);
  }
}
