import { Module } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { OwnerGuard } from "../auth/owner.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { TenantGuard } from "./tenant.guard";

@Module({
  providers: [PrismaService, TenantGuard, PermissionsGuard, OwnerGuard],
  exports: [PrismaService, TenantGuard, PermissionsGuard, OwnerGuard],
})
export class TenancyModule {}
