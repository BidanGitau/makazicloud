import { Controller, Get, UseGuards } from "@nestjs/common";

import { PropertiesService } from "./properties.service";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";

@Controller("properties")
@UseGuards(TenantGuard, PermissionsGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  @RequirePermissions("properties:view")
  findAll(@Tenant() tenant: TenantContext) {
    return this.propertiesService.findAll(tenant);
  }
}
