import { Module } from "@nestjs/common";

import { PermissionsController } from "./permissions.controller";
import { PermissionsService } from "./permissions.service";
import { TenancyModule } from "../tenancy/tenancy.module";

@Module({
  imports: [TenancyModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
})
export class PermissionsModule {}
