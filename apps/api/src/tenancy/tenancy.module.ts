import { Module } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { PermissionsGuard } from "../auth/permissions.guard";
import { TenantGuard } from "./tenant.guard";

@Module({
  providers: [PrismaService, TenantGuard, PermissionsGuard],
  exports: [PrismaService, TenantGuard, PermissionsGuard],
})
export class TenancyModule {}
