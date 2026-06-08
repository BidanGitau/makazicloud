import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";

import { UsersService } from "./users.service";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { OwnerGuard } from "../auth/owner.guard";

@Controller("users")
@UseGuards(TenantGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions("users:view")
  list(@Tenant() tenant: TenantContext) {
    return this.users.list(tenant);
  }

  @Patch(":userId/role")
  @RequirePermissions("users:edit")
  @UseGuards(OwnerGuard)
  assignRole(
    @Tenant() tenant: TenantContext,
    @Param("userId") userId: string,
    @Body() body: { roleId: string | null },
  ) {
    return this.users.assignRole(tenant, userId, body.roleId ?? null);
  }

  @Delete(":userId")
  @RequirePermissions("users:delete")
  @UseGuards(OwnerGuard)
  remove(
    @Tenant() tenant: TenantContext,
    @Param("userId") userId: string,
  ) {
    return this.users.remove(tenant, userId);
  }

  @Delete("invitations/:invitationId")
  @RequirePermissions("users:delete")
  @UseGuards(OwnerGuard)
  revokeInvitation(
    @Tenant() tenant: TenantContext,
    @Param("invitationId") invitationId: string,
  ) {
    return this.users.revokeInvitation(tenant, invitationId);
  }
}
