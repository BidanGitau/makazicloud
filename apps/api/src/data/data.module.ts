import { Module } from "@nestjs/common";

import { DataController } from "./data.controller";
import { DataService } from "./data.service";
import { TenancyModule } from "../tenancy/tenancy.module";
import { RentLedgerService } from "../rent-ledger/rent-ledger.service";

@Module({
  imports: [TenancyModule],
  controllers: [DataController],
  providers: [DataService, RentLedgerService],
})
export class DataModule {}
