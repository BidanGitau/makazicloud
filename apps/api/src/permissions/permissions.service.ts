import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenant: TenantContext) {
    const perms = await this.prisma.permission.findMany({
      where: { organizationId: tenant.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    });
    return perms;
  }
}
