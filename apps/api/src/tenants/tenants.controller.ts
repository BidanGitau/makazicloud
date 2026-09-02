import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import {
  CancelLeaseInput,
  LeaseCancelService,
} from "./lease-cancel.service";

@Controller("tenants")
@UseGuards(TenantGuard, PermissionsGuard)
export class TenantsController {
  constructor(private readonly leaseCancelService: LeaseCancelService) {}

  @Post("cancel-lease")
  @RequirePermissions(
    "tenants:edit",
    "payments:edit",
    "arrears:manage",
    "units:edit",
  )
  cancelLease(@Tenant() tenant: TenantContext, @Body() body: CancelLeaseInput) {
    return this.leaseCancelService.cancel(tenant, body);
  }
}
