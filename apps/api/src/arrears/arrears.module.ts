import { Module } from "@nestjs/common";

import { ArrearsController } from "./arrears.controller";
import { ArrearsService } from "./arrears.service";
import { TenancyModule } from "../tenancy/tenancy.module";
import { RentLedgerService } from "../rent-ledger/rent-ledger.service";

@Module({
  imports: [TenancyModule],
  controllers: [ArrearsController],
  providers: [ArrearsService, RentLedgerService],
})
export class ArrearsModule {}
