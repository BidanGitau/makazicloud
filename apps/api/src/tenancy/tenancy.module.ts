import { Module } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { OwnerGuard } from "../auth/owner.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { PropertyAccessService } from "./property-access.service";
import { TenantGuard } from "./tenant.guard";

@Module({
  providers: [
    PrismaService,
    TenantGuard,
    PermissionsGuard,
    OwnerGuard,
    PropertyAccessService,
  ],
  exports: [
    PrismaService,
    TenantGuard,
    PermissionsGuard,
    OwnerGuard,
    PropertyAccessService,
  ],
})
export class TenancyModule {}
