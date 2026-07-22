import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TenancyModule } from "../tenancy/tenancy.module";
import { EntitlementsModule } from "../entitlements/entitlements.module";

@Module({
  imports: [TenancyModule, EntitlementsModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
