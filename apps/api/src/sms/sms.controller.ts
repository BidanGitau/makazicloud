import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { TenantGuard } from "../tenancy/tenant.guard";
import { SmsService } from "./sms.service";

type SendSmsInput = {
  phoneNumbers?: string[];
  message?: string;
};

@Controller("sms")
@UseGuards(TenantGuard, PermissionsGuard)
export class SmsController {
  constructor(private readonly sms: SmsService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @RequirePermissions("arrears:manage")
  send(@Body() input: SendSmsInput) {
    return this.sms.sendBulk(input);
  }
}
