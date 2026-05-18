import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";

import { RolesService } from "./roles.service";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { RequirePermissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";

@Controller("roles")
@UseGuards(TenantGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions("roles:view")
  list(@Tenant() tenant: TenantContext) {
    return this.roles.list(tenant);
  }

  @Get(":id")
  @RequirePermissions("roles:view")
  getOne(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return this.roles.getById(tenant, id);
  }

  @Post()
  @RequirePermissions("roles:manage")
  create(
    @Tenant() tenant: TenantContext,
    @Body() body: { name: string; description?: string },
  ) {
    return this.roles.create(tenant, body);
  }

  @Patch(":id")
  @RequirePermissions("roles:manage")
  update(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.roles.update(tenant, id, body);
  }

  @Delete(":id")
  @RequirePermissions("roles:manage")
  remove(@Tenant() tenant: TenantContext, @Param("id") id: string) {
    return this.roles.remove(tenant, id);
  }

  @Put(":id/permissions")
  @RequirePermissions("roles:manage")
  setPermissions(
    @Tenant() tenant: TenantContext,
    @Param("id") id: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.roles.setPermissions(tenant, id, body.permissionIds || []);
  }
}
