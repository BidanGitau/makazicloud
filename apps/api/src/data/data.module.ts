import { Module } from "@nestjs/common";

import { DataController } from "./data.controller";
import { DataDashboardService } from "./data-dashboard.service";
import { DataQuerySupport } from "./data-query.support";
import { DataReportsService } from "./data-reports.service";
import { DataService } from "./data.service";
import { DataViewsService } from "./data-views.service";
import { DataWriteSupport } from "./data-write.support";
import { TenancyModule } from "../tenancy/tenancy.module";
import { RentLedgerService } from "../rent-ledger/rent-ledger.service";

@Module({
  imports: [TenancyModule],
  controllers: [DataController],
  providers: [
    DataQuerySupport,
    DataViewsService,
    DataDashboardService,
    DataReportsService,
    DataWriteSupport,
    DataService,
    RentLedgerService,
  ],
})
export class DataModule {}
