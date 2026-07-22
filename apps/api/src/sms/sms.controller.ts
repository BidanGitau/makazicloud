import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { AddonsGuard } from "../entitlements/addons.guard";
import { RequireAddons } from "../entitlements/addons.decorator";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { SmsService } from "./sms.service";

type SendSmsInput = {
  phoneNumbers?: string[];
  message?: string;
  messages?: {
    phoneNumber?: string;
    message?: string;
  }[];
};

@Controller("sms")
@UseGuards(TenantGuard, AddonsGuard, PermissionsGuard)
@RequireAddons("sms")
export class SmsController {
  constructor(private readonly sms: SmsService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @RequirePermissions("arrears:manage")
  send(@Tenant() tenant: TenantContext, @Body() input: SendSmsInput) {
    return this.sms.sendBulk(tenant, input);
  }

  @Get("balance")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @RequirePermissions("settings:manage")
  balance(@Tenant() tenant: TenantContext) {
    return this.sms.getBalance(tenant);
  }

  @Get("config")
  @RequirePermissions("settings:view")
  config(@Tenant() tenant: TenantContext) {
    return this.sms.getConfig(tenant);
  }

  @Post("config")
  @RequirePermissions("settings:manage")
  saveConfig(@Tenant() tenant: TenantContext, @Body() input: any) {
    return this.sms.saveConfig(tenant, input);
  }
}
