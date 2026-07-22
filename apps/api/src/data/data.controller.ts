import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

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
    @Res({ passthrough: true }) response: Response,
  ) {
    if (table === "dashboard_bundle") {
      response.setHeader(
        "Cache-Control",
        "private, max-age=30, stale-while-revalidate=120",
      );
    } else {
      response.setHeader(
        "Cache-Control",
        "private, max-age=15, stale-while-revalidate=60",
      );
    }
    return this.dataService.list(table, tenant, query);
  }

  @Get(":id")
  get(
    @Param("table") table: string,
    @Param("id") id: string,
    @Tenant() tenant: TenantContext,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader(
      "Cache-Control",
      "private, max-age=15, stale-while-revalidate=60",
    );
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
