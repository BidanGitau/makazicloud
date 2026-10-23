import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";

import { DataService } from "./data.service";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { OwnerGuard } from "../auth/owner.guard";

@Controller("payments")
@UseGuards(TenantGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly dataService: DataService) {}

  @Post(":id/void")
  @RequirePermissions("payments:delete")
  @UseGuards(OwnerGuard)
  void(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.dataService.voidPayment(tenant, id, String(body?.reason || ""));
  }

  @Post(":id/correct")
  @RequirePermissions("payments:edit")
  @UseGuards(OwnerGuard)
  correct(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() body: { amount?: unknown; reason?: string },
  ) {
    return this.dataService.correctPayment(tenant, id, body || {});
  }
}
