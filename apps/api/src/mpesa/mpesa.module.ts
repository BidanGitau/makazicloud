import { Module } from "@nestjs/common";

import { MpesaController, MpesaPublicController } from "./mpesa.controller";
import { MpesaService } from "./mpesa.service";
import { RentLedgerService } from "../rent-ledger/rent-ledger.service";
import { TenancyModule } from "../tenancy/tenancy.module";
import { EntitlementsModule } from "../entitlements/entitlements.module";

@Module({
  imports: [TenancyModule, EntitlementsModule],
  controllers: [MpesaController, MpesaPublicController],
  providers: [MpesaService, RentLedgerService],
})
export class MpesaModule {}
