import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";

import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { MpesaService } from "./mpesa.service";

@Controller("mpesa")
@UseGuards(TenantGuard, PermissionsGuard)
export class MpesaController {
  constructor(private readonly mpesa: MpesaService) {}

  @Get("config")
  @RequirePermissions("settings:view")
  getConfig(@Tenant() tenant: TenantContext) {
    return this.mpesa.getConfig(tenant);
  }

  @Post("config")
  @RequirePermissions("settings:manage")
  saveConfig(@Tenant() tenant: TenantContext, @Body() body: any) {
    return this.mpesa.saveConfig(tenant, body);
  }

  @Post("register-url")
  @RequirePermissions("settings:manage")
  registerUrl(@Tenant() tenant: TenantContext) {
    return this.mpesa.registerUrl(tenant);
  }

  @Get("unassigned")
  @RequirePermissions("payments:view")
  unassigned(@Tenant() tenant: TenantContext) {
    return this.mpesa.listUnassigned(tenant);
  }

  @Post("transactions/:id/assign")
  @RequirePermissions("payments:create")
  assign(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() body: { tenantId?: string },
  ) {
    return this.mpesa.assignTransaction(tenant, id, body.tenantId);
  }
}

@Controller("mpesa/c2b")
export class MpesaPublicController {
  constructor(private readonly mpesa: MpesaService) {}

  @Post("validation")
  validation(@Body() body: any) {
    return this.mpesa.validateC2B(body);
  }

  @Post("confirmation")
  confirmation(@Body() body: any) {
    return this.mpesa.confirmC2B(body);
  }
}
