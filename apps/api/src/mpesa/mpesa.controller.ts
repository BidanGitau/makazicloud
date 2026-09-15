import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiQuery, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { AddonsGuard } from "../entitlements/addons.guard";
import { RequireAddons } from "../entitlements/addons.decorator";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { MpesaService } from "./mpesa.service";

@ApiTags("M-Pesa")
@ApiSecurity("organization")
@Controller("mpesa")
@UseGuards(TenantGuard, AddonsGuard, PermissionsGuard)
@RequireAddons("mpesa")
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

  @Post("sms-gateway-otp")
  @RequirePermissions("settings:manage")
  createPairingOtp(@Tenant() tenant: TenantContext) {
    return this.mpesa.createPairingOtp(tenant);
  }

  @Post("sms-gateway-token")
  @RequirePermissions("settings:manage")
  rotateSmsGatewayToken(@Tenant() tenant: TenantContext) {
    return this.mpesa.rotateSmsGatewayToken(tenant);
  }

  @Post("register-url")
  @RequirePermissions("settings:manage")
  registerUrl(@Tenant() tenant: TenantContext) {
    return this.mpesa.registerUrl(tenant);
  }

  @Get("unassigned")
  @RequirePermissions("payments:view")
  unassigned(@Tenant() tenant: TenantContext, @Query("q") q?: string) {
    return this.mpesa.listUnassigned(tenant, q);
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

@ApiTags("M-Pesa C2B")
@Controller("mpesa/c2b")
@Throttle({ default: { limit: 600, ttl: 60_000 } })
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

@ApiTags("SMS Gateway")
@ApiSecurity("smsGatewayToken")
@Controller("sms-gateway")
@Throttle({ default: { limit: 120, ttl: 60_000 } })
export class SmsGatewayPublicController {
  constructor(private readonly mpesa: MpesaService) {}

  @Post("pair")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiBody({
    schema: {
      type: "object",
      required: ["otp"],
      properties: {
        otp: { type: "string", example: "482913" },
        sim: { type: "string", example: "254712345678" },
        deviceName: { type: "string", example: "Store PayBill phone" },
      },
    },
  })
  pair(@Body() body: { otp?: string; sim?: string; deviceName?: string }) {
    return this.mpesa.pairSmsGateway(body || {});
  }

  @Get("tenants")
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiQuery({ name: "token", required: false })
  @ApiQuery({ name: "q", required: false, description: "Name, unit, or property" })
  listTenants(
    @Query("q") q?: string,
    @Query("token") token?: string,
    @Headers("x-gateway-token") headerToken?: string,
    @Headers("authorization") authorization?: string,
  ) {
    const bearer = String(authorization || "").replace(/^Bearer\s+/i, "").trim();
    return this.mpesa.listGatewayTenants(token || headerToken || bearer, q);
  }

  @Post("inbound")
  @Get("inbound")
  @ApiQuery({ name: "token", required: false, description: "sgw_ token from Settings → M-Pesa" })
  @ApiBody({
    required: false,
    schema: {
      type: "object",
      properties: {
        from: { type: "string", example: "MPESA" },
        sim: { type: "string", example: "254712345678" },
        account: { type: "string", example: "347086#m6" },
        unit: { type: "string", example: "m6" },
        tenantId: { type: "string", example: "tenant_cuid" },
        text: {
          type: "string",
          example:
            "NKJ7XXXX Confirmed. on 15/9/26 at 1:42 PM Ksh2,000.00 received from JOHN DOE 254712345678. Account Number 347086#M6",
        },
      },
    },
  })
  inbound(
    @Body() body: any,
    @Query() query: Record<string, string> = {},
    @Headers("x-gateway-token") headerToken?: string,
    @Headers("authorization") authorization?: string,
  ) {
    const bearer = String(authorization || "").replace(/^Bearer\s+/i, "").trim();
    const payload =
      body && typeof body === "object" && !Array.isArray(body)
        ? { ...query, ...body }
        : { ...query, text: typeof body === "string" ? body : query.text || query.msg };
    return this.mpesa.inboundSms(
      payload,
      query.token || headerToken || bearer || payload.token,
    );
  }
}
