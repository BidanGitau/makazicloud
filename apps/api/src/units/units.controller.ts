import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import {
  RentAdjustmentService,
  type RentAdjustmentInput,
} from "./rent-adjustment.service";

@Controller("units")
@UseGuards(TenantGuard, PermissionsGuard)
export class UnitsController {
  constructor(private readonly rentAdjustmentService: RentAdjustmentService) {}

  @Post("rent-adjustment")
  @RequirePermissions("units:edit")
  adjustRent(
    @Tenant() tenant: TenantContext,
    @Body() body: RentAdjustmentInput,
  ) {
    return this.rentAdjustmentService.apply(tenant, body);
  }
}
