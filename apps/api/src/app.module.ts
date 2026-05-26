import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";

import { HealthController } from "./health/health.controller";
import { PublicPropertiesController } from "./properties/public-properties.controller";
import { PropertiesController } from "./properties/properties.controller";
import { PropertiesService } from "./properties/properties.service";
import { AuthModule } from "./auth/auth.module";
import { DataModule } from "./data/data.module";
import { EmailModule } from "./email/email.module";
import { TenancyModule } from "./tenancy/tenancy.module";
import { ArrearsModule } from "./arrears/arrears.module";
import { UsersModule } from "./users/users.module";
import { RolesModule } from "./roles/roles.module";
import { PermissionsModule } from "./permissions/permissions.module";
import { InvitationsModule } from "./invitations/invitations.module";
import { TenantPortalModule } from "./tenant-portal/tenant-portal.module";
import { OrganizationModule } from "./organization/organization.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ["apps/api/.env", ".env"],
      isGlobal: true,
    }),


    ThrottlerModule.forRoot([
      { name: "auth", ttl: 60_000, limit: 60 },
      { name: "public", ttl: 60_000, limit: 30 },
      { name: "public-listings", ttl: 60_000, limit: 120 },
    ]),
    TenancyModule,
    AuthModule,
    DataModule,
    EmailModule,
    ArrearsModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    InvitationsModule,
    TenantPortalModule,
    OrganizationModule,
  ],
  controllers: [HealthController, PropertiesController, PublicPropertiesController],
  providers: [PropertiesService],
})
export class AppModule {}
