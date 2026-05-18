import { Module } from "@nestjs/common";

import {
  PublicTenantPortalInvitationsController,
  TenantPortalController,
  TenantPortalInvitationsController,
} from "./tenant-portal.controller";
import { TenantPortalService } from "./tenant-portal.service";
import { TenantPortalGuard } from "./tenant-portal.guard";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [TenancyModule, AuthModule],
  controllers: [
    TenantPortalInvitationsController,
    PublicTenantPortalInvitationsController,
    TenantPortalController,
  ],
  providers: [TenantPortalService, TenantPortalGuard],
})
export class TenantPortalModule {}
