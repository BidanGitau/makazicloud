import { Module } from "@nestjs/common";

import { TenancyModule } from "../tenancy/tenancy.module";
import { OrganizationController } from "./organization.controller";
import { OrganizationService } from "./organization.service";

@Module({
  imports: [TenancyModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
})
export class OrganizationModule {}
