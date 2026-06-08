import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

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
import { MpesaModule } from "./mpesa/mpesa.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ["apps/api/.env", ".env"],
      isGlobal: true,
    }),


    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 1200 },
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
    MpesaModule,
  ],
  controllers: [HealthController, PropertiesController, PublicPropertiesController],
  providers: [
    PropertiesService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
