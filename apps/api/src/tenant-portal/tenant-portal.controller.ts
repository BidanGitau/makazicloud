import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import type { Response } from "express";

import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { AuthService } from "../auth/auth.service";
import { CurrentUser, type CurrentUserInfo } from "../auth/current-user.decorator";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { TenantPortalService } from "./tenant-portal.service";
import {
  PortalSession,
  TenantPortalGuard,
  type TenantPortalSession,
} from "./tenant-portal.guard";

// -------------------------------------------------------------------
// Admin → Tenant invite / revoke.
// Guarded by TenantGuard (org + auth) and PermissionsGuard.
// -------------------------------------------------------------------

@Controller("tenants/:tenantId/portal-invite")
@UseGuards(TenantGuard, PermissionsGuard)
export class TenantPortalInvitationsController {
  constructor(private readonly tenantPortal: TenantPortalService) {}

  // Status (linked? pending invite?) — used by the tenant details panel
  // so admin can see at-a-glance whether portal access is set up.
  @Get()
  @RequirePermissions("tenants:edit")
  status(
    @Tenant() tenant: TenantContext,
    @Param("tenantId") tenantId: string,
  ) {
    return this.tenantPortal.getInviteStatus(tenant, tenantId);
  }

  @Post()
  @RequirePermissions("tenants:edit")
  createInvite(
    @Tenant() tenant: TenantContext,
    @Param("tenantId") tenantId: string,
    @CurrentUser() currentUser: CurrentUserInfo,
    @Body() body: { sendEmail?: boolean } = {},
  ) {
    return this.tenantPortal.createInvite(
      tenant,
      tenantId,
      currentUser.userId,
      { sendEmail: body.sendEmail !== false },
    );
  }

  @Delete()
  @RequirePermissions("tenants:edit")
  revoke(@Tenant() tenant: TenantContext, @Param("tenantId") tenantId: string) {
    return this.tenantPortal.revokeAccess(tenant, tenantId);
  }
}

// -------------------------------------------------------------------
// Public invite lookup / accept.
// Throttled hard — these are unauthenticated endpoints that can be
// brute-forced. 30/min/IP is plenty for legitimate flows.
// -------------------------------------------------------------------

@Controller("public/tenant-portal-invitations")
@UseGuards(ThrottlerGuard)
@Throttle({ public: { limit: 30, ttl: 60_000 } })
export class PublicTenantPortalInvitationsController {
  constructor(
    private readonly tenantPortal: TenantPortalService,
    private readonly auth: AuthService,
  ) {}

  @Get(":token")
  lookup(@Param("token") token: string) {
    return this.tenantPortal.lookupInvite(token);
  }

  @Post(":token/accept")
  async accept(
    @Param("token") token: string,
    @Body() body: { password: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.tenantPortal.acceptInvite(token, body);
    response.setHeader("set-cookie", this.auth.createCookie(result.token));
    return { user: result.user };
  }
}

// -------------------------------------------------------------------
// Tenant-only portal API.
// TenantPortalGuard attaches the resolved tenant session; controllers
// read it via @PortalSession() instead of re-decoding the cookie.
// -------------------------------------------------------------------

@Controller("tenant-portal")
@UseGuards(TenantPortalGuard)
export class TenantPortalController {
  constructor(private readonly tenantPortal: TenantPortalService) {}

  @Get("me")
  me(@PortalSession() session: TenantPortalSession) {
    return this.tenantPortal.buildProfile(session);
  }

  // Bundled portal payload — replaces the old four parallel requests.
  @Get("dashboard")
  dashboard(@PortalSession() session: TenantPortalSession) {
    return this.tenantPortal.getDashboard(session);
  }

  @Get("payments")
  payments(@PortalSession() session: TenantPortalSession) {
    return this.tenantPortal.listPayments(session);
  }

  @Get("arrears")
  arrears(@PortalSession() session: TenantPortalSession) {
    return this.tenantPortal.listArrears(session);
  }

  @Get("maintenance-requests")
  maintenanceRequests(@PortalSession() session: TenantPortalSession) {
    return this.tenantPortal.listMaintenanceRequests(session);
  }

  @Post("maintenance-requests")
  createMaintenanceRequest(
    @PortalSession() session: TenantPortalSession,
    @Body()
    body: {
      category?: string;
      title?: string;
      description?: string;
      priority?: string;
    },
  ) {
    return this.tenantPortal.createMaintenanceRequest(session, body);
  }
}
