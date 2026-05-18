import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { DataService } from "./data.service";
import { Tenant } from "../tenancy/tenant.decorator";
import type { TenantContext } from "../tenancy/tenant-context";
import { TenantGuard } from "../tenancy/tenant.guard";
import { PermissionsGuard } from "../auth/permissions.guard";

@Controller("data/:table")
@UseGuards(TenantGuard, PermissionsGuard)
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get()
  list(
    @Param("table") table: string,
    @Tenant() tenant: TenantContext,
    @Query() query: Record<string, any>,
  ) {
    return this.dataService.list(table, tenant, query);
  }

  @Get(":id")
  get(
    @Param("table") table: string,
    @Param("id") id: string,
    @Tenant() tenant: TenantContext,
  ) {
    return this.dataService.get(table, tenant, id);
  }

  @Post()
  create(
    @Param("table") table: string,
    @Tenant() tenant: TenantContext,
    @Body() body: Record<string, any>,
  ) {
    return this.dataService.create(table, tenant, body);
  }

  @Patch(":id")
  update(
    @Param("table") table: string,
    @Param("id") id: string,
    @Tenant() tenant: TenantContext,
    @Body() body: Record<string, any>,
  ) {
    return this.dataService.update(table, tenant, id, body);
  }

  @Delete(":id")
  remove(
    @Param("table") table: string,
    @Param("id") id: string,
    @Tenant() tenant: TenantContext,
  ) {
    return this.dataService.remove(table, tenant, id);
  }
}
