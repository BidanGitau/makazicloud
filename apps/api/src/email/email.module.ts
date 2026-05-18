import { Module } from "@nestjs/common";

import { TenancyModule } from "../tenancy/tenancy.module";
import { EmailController } from "./email.controller";

@Module({
  imports: [TenancyModule],
  controllers: [EmailController],
})
export class EmailModule {}
