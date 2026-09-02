import { Module } from "@nestjs/common";

import { MemoryCacheModule } from "../cache/memory-cache.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { LeaseCancelService } from "./lease-cancel.service";
import { TenantsController } from "./tenants.controller";

@Module({
  imports: [TenancyModule, MemoryCacheModule],
  controllers: [TenantsController],
  providers: [LeaseCancelService],
  exports: [LeaseCancelService],
})
export class TenantsModule {}
