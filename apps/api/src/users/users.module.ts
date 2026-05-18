import { Module } from "@nestjs/common";

import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { TenancyModule } from "../tenancy/tenancy.module";

@Module({
  imports: [TenancyModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
