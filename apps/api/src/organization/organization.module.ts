import { Module } from "@nestjs/common";

import { TenancyModule } from "../tenancy/tenancy.module";
import { OrganizationController } from "./organization.controller";
import { OrganizationService } from "./organization.service";
import { EntitlementsModule } from "../entitlements/entitlements.module";

@Module({
  imports: [TenancyModule, EntitlementsModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
})
export class OrganizationModule {}
