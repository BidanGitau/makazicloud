import { Controller, Post, UseGuards } from "@nestjs/common";

import { ArrearsService } from "./arrears.service";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";

@Controller("arrears")
@UseGuards(TenantGuard, PermissionsGuard)
export class ArrearsController {
  constructor(private readonly arrearsService: ArrearsService) {}

  @Post("populate")
  @RequirePermissions("arrears:manage")
  populate(@Tenant() tenant: TenantContext) {
    return this.arrearsService.populateCurrentMonth(tenant);
  }
}
