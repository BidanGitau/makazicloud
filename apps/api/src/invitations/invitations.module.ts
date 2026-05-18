import { Module } from "@nestjs/common";

import {
  InviteController,
  PublicInvitationsController,
} from "./invitations.controller";
import { InvitationsService } from "./invitations.service";
import { TenancyModule } from "../tenancy/tenancy.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [TenancyModule, AuthModule],
  controllers: [InviteController, PublicInvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
