import { Controller, Get, UseGuards } from "@nestjs/common";

import { PermissionsService } from "./permissions.service";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";

@Controller("permissions")
@UseGuards(TenantGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @RequirePermissions("roles:view")
  list(@Tenant() tenant: TenantContext) {
    return this.permissions.list(tenant);
  }
}
