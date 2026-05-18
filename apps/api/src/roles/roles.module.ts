import { Module } from "@nestjs/common";

import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";
import { TenancyModule } from "../tenancy/tenancy.module";

@Module({
  imports: [TenancyModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
