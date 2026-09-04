import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { PropertyAccessService } from "../tenancy/property-access.service";
import { assertEmailFreeForTenant } from "../auth/email-uniqueness";
import { MemoryCacheService } from "../cache/memory-cache.service";
import { RentLedgerService } from "../rent-ledger/rent-ledger.service";
import { DataDashboardService } from "./data-dashboard.service";
import { DataQuerySupport } from "./data-query.support";
import { DataReportsService } from "./data-reports.service";
import { DataViewsService } from "./data-views.service";
import { DataWriteSupport } from "./data-write.support";
import {
  DASHBOARD_CACHE_TTL_MS,
  PRIVATE_DATA_CACHE_TTL_MS,
} from "./data.constants";
import { handlePrismaError } from "./data.errors";
import {
  isPrivateDataCacheable,
  privateCachePrefix,
  stableCachePart,
  stripProtectedFields,
  toCamel,
  toCamelDeep,
  toNumber,
  toSnake,
} from "./data.mappers";

@Injectable()
export class DataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentLedger: RentLedgerService,
    private readonly propertyAccess: PropertyAccessService,
    private readonly cache: MemoryCacheService,
    private readonly query: DataQuerySupport,
    private readonly views: DataViewsService,
    private readonly dashboard: DataDashboardService,
    private readonly reports: DataReportsService,
    private readonly writes: DataWriteSupport,
  ) {}

  async list(table: string, tenant: TenantContext, query: Record<string, any>) {
    if (table === "dashboard_bundle") {
      return this.cache.getOrSet(
        `${privateCachePrefix(tenant.organizationId)}dashboard_bundle:${stableCachePart({
          accessScope: tenant.propertyAccessScope,
          propertyIds: [...(tenant.propertyIds || [])].sort(),
          query,
        })}`,
        DASHBOARD_CACHE_TTL_MS,
        () => this.dashboard.listBundle(tenant, query),
      );
    }

    if (isPrivateDataCacheable(table)) {
      return this.cachedPrivateRead("list", table, tenant, query, () =>
        this.listUncached(table, tenant, query),
      );
    }

    return this.listUncached(table, tenant, query);
  }

  async get(table: string, tenant: TenantContext, id: string) {
    if (isPrivateDataCacheable(table)) {
      return this.cachedPrivateRead("get", table, tenant, { id }, () =>
        this.getUncached(table, tenant, id),
      );
    }

    return this.getUncached(table, tenant, id);
  }

  async create(table: string, tenant: TenantContext, body: Record<string, any>) {
    const model = this.query.getModel(table);
    const data = stripProtectedFields(toCamelDeep(body));
    await this.propertyAccess.assertWritableReferences(tenant, data);
    if (table === "properties") {
      await this.writes.ensurePropertyLimitAllowsCreate(tenant);
    }

    if (table === "units") {
      data.status = String(data.status || "vacant").toLowerCase();
      await this.writes.ensureUnitCapacityAllowsCreate(tenant, data);
    }

    if (table === "tenants") {
      data.openingBalance = toNumber(data.openingBalance);
      await this.writes.ensureTenantUnitIsAvailable(tenant, data.unitId);

      if (data.email) {
        await assertEmailFreeForTenant(this.prisma, data.email, {
          organizationId: tenant.organizationId,
        });
      }
    }

    if (table === "utility_bills" && data.assignAll && !data.unitId) {
      const rows = await this.writes.createSharedUtilityBills(tenant, data);
      this.invalidateTenantCaches(tenant, table);
      return rows;
    }
    if (table === "utility_bills") {
      delete data.splitAmount;
    }

    if (table === "owner_settlements") {
      await this.writes.assertOwnerSettlementCanBeCreated(tenant, data);
    }

    try {
      const row = await model.create({
        data: {
          ...data,
          organizationId: tenant.organizationId,
        },
      });

      if (table === "tenants") {
        await this.writes.markUnitStatus(tenant, data.unitId, "occupied");
        await this.writes.syncTenantOpeningBalanceArrear(tenant, row);
      }

      if (table === "payments") {
        await this.rentLedger.applyPayment(tenant, row);
      }

      this.invalidateTenantCaches(tenant, table);
      return toSnake(row);
    } catch (error) {
      handlePrismaError(table, error);
    }
  }

  async update(
    table: string,
    tenant: TenantContext,
    id: string,
    body: Record<string, any>,
  ) {
    const model = this.query.getModel(table);
    const existingRow = await this.getUncached(table, tenant, id);
    if (table === "owner_settlements") {
      throw new ConflictException(
        "This month has already been disbursed and cannot be amended.",
      );
    }
    const data = stripProtectedFields(toCamelDeep(body));
    await this.propertyAccess.assertWritableReferences(tenant, data);
    if (table === "units" && data.status !== undefined) {
      data.status = String(data.status || "vacant").toLowerCase();
    }

    if (table === "tenants") {
      if (data.openingBalance !== undefined) {
        data.openingBalance = toNumber(data.openingBalance);
      }
      await this.writes.ensureTenantUnitIsAvailable(tenant, data.unitId, id);

      if (
        data.email &&
        existingRow?.email &&
        String(data.email).toLowerCase() !==
          String(existingRow.email).toLowerCase()
      ) {
        await assertEmailFreeForTenant(this.prisma, data.email, {
          organizationId: tenant.organizationId,
          excludeTenantId: id,
        });
      } else if (data.email && !existingRow?.email) {
        await assertEmailFreeForTenant(this.prisma, data.email, {
          organizationId: tenant.organizationId,
          excludeTenantId: id,
        });
      }
    }

    try {
      const result = await model.updateMany({
        where: this.propertyAccess.scopeWhere(table, tenant, {
          id,
          organizationId: tenant.organizationId,
        }),
        data,
      });
      if (result.count === 0) {
        throw new NotFoundException(`${table} row was not found`);
      }
      const row = await model.findFirst({
        where: this.propertyAccess.scopeWhere(table, tenant, {
          id,
          organizationId: tenant.organizationId,
        }),
      });

      if (table === "tenants") {
        const nextStatus = String(data.status ?? row?.status ?? "").toLowerCase();
        if (nextStatus === "inactive") {
          await this.writes.markUnitStatus(
            tenant,
            data.unitId || existingRow.unit_id,
            "vacant",
          );
        } else {
          await this.writes.markUnitStatus(tenant, data.unitId, "occupied");
        }
        await this.writes.syncTenantOpeningBalanceArrear(tenant, row);
      }

      if (
        table === "properties" &&
        data.rentDueDay !== undefined &&
        Number(data.rentDueDay) !== Number(existingRow.rent_due_day ?? 5)
      ) {
        await this.writes.syncPropertyArrearDueDates(
          tenant,
          id,
          Number(data.rentDueDay) || 5,
        );
      }

      this.invalidateTenantCaches(tenant, table);
      return toSnake(row);
    } catch (error) {
      handlePrismaError(table, error);
    }
  }

  async remove(table: string, tenant: TenantContext, id: string) {
    if (table === "owner_settlements") {
      throw new ConflictException(
        "A released disbursement cannot be deleted or amended.",
      );
    }
    const model = this.query.getModel(table);
    const existingRow =
      table === "tenants" ? await this.getUncached(table, tenant, id) : null;
    const result = await model.deleteMany({
      where: this.propertyAccess.scopeWhere(table, tenant, {
        id,
        organizationId: tenant.organizationId,
      }),
    });
    if (result.count === 0) {
      throw new NotFoundException(`${table} row was not found`);
    }
    if (table === "tenants") {
      await this.writes.markUnitStatus(tenant, existingRow?.unit_id, "vacant");
    }
    this.invalidateTenantCaches(tenant, table);
    return { ok: true };
  }

  private async listUncached(
    table: string,
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
    if (table === "dashboard_overview") {
      return this.dashboard.listOverview(tenant, query);
    }

    const viewRows = await this.views.list(table, tenant, query);
    if (viewRows !== null) return viewRows;

    const reportRows = await this.reports.list(table, tenant, query);
    if (reportRows !== null) return reportRows;

    const model = this.query.getModel(table);
    const where = this.query.buildWhere(table, tenant, query);
    const args: Record<string, any> = { where };

    if (query.orderBy) {
      args.orderBy = {
        [toCamel(query.orderBy)]: query.order === "desc" ? "desc" : "asc",
      };
    }

    this.query.applyPagination(args, query);

    try {
      return toSnake(await model.findMany(args));
    } catch (error) {
      handlePrismaError(table, error);
    }
  }

  private async getUncached(table: string, tenant: TenantContext, id: string) {
    const model = this.query.getModel(table);
    const row = await model.findFirst({
      where: this.propertyAccess.scopeWhere(table, tenant, {
        id,
        organizationId: tenant.organizationId,
      }),
    });

    if (!row) throw new NotFoundException(`${table} row was not found`);
    return toSnake(row);
  }

  private cachedPrivateRead<T>(
    operation: "get" | "list",
    table: string,
    tenant: TenantContext,
    query: Record<string, any>,
    load: () => Promise<T>,
  ) {
    return this.cache.getOrSet(
      `${privateCachePrefix(tenant.organizationId)}${operation}:${table}:${stableCachePart({
        accessScope: tenant.propertyAccessScope,
        propertyIds: [...(tenant.propertyIds || [])].sort(),
        query,
      })}`,
      PRIVATE_DATA_CACHE_TTL_MS,
      load,
    );
  }

  private invalidateTenantCaches(tenant: TenantContext, table: string) {
    this.cache.invalidatePrefix(privateCachePrefix(tenant.organizationId));
    if (["properties", "units", "blocks"].includes(table)) {
      this.cache.invalidatePrefix("public:properties:");
    }
  }
}
