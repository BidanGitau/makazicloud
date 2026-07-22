import { Module } from "@nestjs/common";

import { TenancyModule } from "../tenancy/tenancy.module";
import { AddonsGuard } from "./addons.guard";
import { EntitlementsService } from "./entitlements.service";

@Module({
  imports: [TenancyModule],
  providers: [AddonsGuard, EntitlementsService],
  exports: [AddonsGuard, EntitlementsService],
})
export class EntitlementsModule {}
