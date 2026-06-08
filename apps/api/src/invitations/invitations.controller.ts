import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";

import { InvitationsService } from "./invitations.service";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { AuthService } from "../auth/auth.service";
import { readSessionToken, verifySessionToken } from "../auth/session-token";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { OwnerGuard } from "../auth/owner.guard";


@Controller("users")
@UseGuards(TenantGuard, PermissionsGuard)
export class InviteController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly auth: AuthService,
  ) {}

  @Post("invite")
  @RequirePermissions("users:create")
  @UseGuards(OwnerGuard)
  invite(
    @Tenant() tenant: TenantContext,
    @Headers("cookie") cookieHeader: string | undefined,
    @Body() body: { email: string; fullName?: string; roleId?: string | null },
  ) {

    const payload = verifySessionToken(readSessionToken(cookieHeader));
    const createdById = payload?.userId || "";
    return this.invitations.invite(tenant, createdById, body);
  }
}


@Controller("public/invitations")
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class PublicInvitationsController {
  constructor(
    private readonly invitations: InvitationsService,
    private readonly auth: AuthService,
  ) {}

  @Get(":token")
  lookup(@Param("token") token: string) {
    return this.invitations.getByToken(token);
  }

  @Post(":token/accept")
  async accept(
    @Param("token") token: string,
    @Body() body: { password: string; fullName?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.invitations.accept(token, body);
    response.setHeader("set-cookie", this.auth.createCookie(result.token));
    return { user: result.user };
  }
}
