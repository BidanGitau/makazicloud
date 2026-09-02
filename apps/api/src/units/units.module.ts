import { Module } from "@nestjs/common";

import { MemoryCacheModule } from "../cache/memory-cache.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { RentAdjustmentService } from "./rent-adjustment.service";
import { UnitsController } from "./units.controller";

@Module({
  imports: [TenancyModule, MemoryCacheModule],
  controllers: [UnitsController],
  providers: [RentAdjustmentService],
  exports: [RentAdjustmentService],
})
export class UnitsModule {}
