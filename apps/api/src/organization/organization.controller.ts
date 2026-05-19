import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";

import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { OrganizationService } from "./organization.service";

@Controller("organization")
@UseGuards(TenantGuard, PermissionsGuard)
export class OrganizationController {
  constructor(private readonly organization: OrganizationService) {}

  @Get("branding")
  getBranding(@Tenant() tenant: TenantContext) {
    return this.organization.getBranding(tenant);
  }

  @Patch("branding")
  @RequirePermissions("settings:manage")
  updateBranding(
    @Tenant() tenant: TenantContext,
    @Body()
    body: {
      name?: string;
      institutionName?: string | null;
      logoDataUrl?: string | null;
    },
  ) {
    return this.organization.updateBranding(tenant, body);
  }

  @Get("public-listings")
  getPublicListings(@Tenant() tenant: TenantContext) {
    return this.organization.getPublicListingsSettings(tenant);
  }

  @Patch("public-listings")
  @RequirePermissions("settings:manage")
  updatePublicListings(
    @Tenant() tenant: TenantContext,
    @Body() body: { enabled?: boolean },
  ) {
    return this.organization.updatePublicListingsSettings(tenant, body);
  }
}
