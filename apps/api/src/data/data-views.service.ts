import { Injectable } from "@nestjs/common";

import { arrearBalance, isOverdueArrear, isOutstandingArrear } from "../billing/arrear-balance";
import type { TenantContext } from "../tenancy/tenant-context";
import { DataQuerySupport } from "./data-query.support";
import { handlePrismaError } from "./data.errors";
import { monthStart } from "./data.dates";
import { toCamel, toNumber, toSnake } from "./data.mappers";

@Injectable()
export class DataViewsService {
  constructor(private readonly query: DataQuerySupport) {}

  async list(table: string, tenant: TenantContext, query: Record<string, any>) {
    if (table === "v_tenant_overview") {
      return this.listTenantOverview(tenant, query);
    }
    if (table === "v_utility_bills_with_details") {
      return this.listUtilityBillsWithDetails(tenant, query);
    }
    if (table === "v_arrears_with_details") {
      return this.listArrearsWithDetails(tenant, query);
    }
    if (table === "v_maintenance_requests_with_details") {
      return this.listMaintenanceRequestsWithDetails(tenant, query);
    }
    if (table === "v_owner_advances_with_details") {
      return this.listOwnerAdvancesWithDetails(tenant, query);
    }
    return null;
  }

  private async listUtilityBillsWithDetails(
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
    const where = this.query.buildWhere("utility_bills", tenant, query);
    const args: Record<string, any> = {
      where,
      include: {
        property: { select: { name: true } },
        block: { select: { name: true } },
        unit: { select: { unitNumber: true } },
      },
    };

    if (query.orderBy) {
      args.orderBy = {
        [toCamel(query.orderBy)]: query.order === "desc" ? "desc" : "asc",
      };
    }

    this.query.applyPagination(args, query);

    try {
      const rows = await this.query.prisma.utilityBill.findMany(args as any);
      return toSnake(
        (rows as any[]).map(({ property, block, unit, ...row }) => ({
          ...row,
          propertyName: property?.name || null,
          blockName: block?.name || null,
          unitNumber: unit?.unitNumber || null,
        })),
      );
    } catch (error) {
      handlePrismaError("v_utility_bills_with_details", error);
    }
  }

  private async listTenantOverview(tenant: TenantContext, query: Record<string, any>) {
    const normalizedQuery = { ...query };
    if (normalizedQuery.tenant_id) {
      normalizedQuery.id = normalizedQuery.tenant_id;
      delete normalizedQuery.tenant_id;
    }

    const propertyId = normalizedQuery.property_id || normalizedQuery.propertyId;
    const blockId = normalizedQuery.block_id || normalizedQuery.blockId;
    delete normalizedQuery.property_id;
    delete normalizedQuery.propertyId;
    delete normalizedQuery.block_id;
    delete normalizedQuery.blockId;
    delete normalizedQuery.start_date;
    delete normalizedQuery.startDate;
    delete normalizedQuery.end_date;
    delete normalizedQuery.endDate;

    const where = this.query.buildWhere("tenants", tenant, normalizedQuery);
    if (propertyId) {
      where.unit = { ...(where.unit || {}), propertyId };
    }
    if (blockId) {
      where.unit = { ...(where.unit || {}), blockId };
    }
    const args: Record<string, any> = {
      where,
      include: {
        unit: {
          include: {
            property: { select: { id: true, name: true } },
            block: { select: { id: true, name: true } },
          },
        },
      },
    };

    if (normalizedQuery.orderBy) {
      args.orderBy = {
        [toCamel(normalizedQuery.orderBy)]:
          normalizedQuery.order === "desc" ? "desc" : "asc",
      };
    }

    this.query.applyPagination(args, normalizedQuery);

    try {
      const rows = await this.query.prisma.tenant.findMany(args as any);
      const tenantIds = (rows as any[]).map((row) => row.id);
      const ledgerArrears = tenantIds.length
        ? await this.query.prisma.arrear.findMany({
            where: {
              organizationId: tenant.organizationId,
              tenantId: { in: tenantIds },
              status: { not: "waived" },
            },
            select: {
              tenantId: true,
              amountDue: true,
              amountPaid: true,
              dueDate: true,
              month: true,
              status: true,
            },
          })
        : [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const monthRentByTenant = new Map<string, Record<string, any>>();
      const balanceStatsByTenant = new Map<
        string,
        { arrearsBalance: number; outstandingBalance: number; oldestDue: Date | null }
      >();
      for (const arrear of ledgerArrears) {
        const monthKey = monthStart(new Date(arrear.month)).toISOString().slice(0, 7);
        const due = toNumber(arrear.amountDue);
        const paidAmount = toNumber(arrear.amountPaid);
        const status = String(arrear.status || "").toLowerCase();
        const paid =
          status === "cleared" ||
          status === "prepaid" ||
          (due > 0 && paidAmount >= due);

        const months = monthRentByTenant.get(arrear.tenantId) || {};
        months[monthKey] = {
          status,
          amountDue: due,
          amountPaid: paidAmount,
          balance: Math.max(0, due - paidAmount),
          paid,
        };
        monthRentByTenant.set(arrear.tenantId, months);

        if (!["pending", "partial"].includes(status)) continue;
        const balance = arrearBalance(arrear.amountDue, arrear.amountPaid);
        if (balance <= 0) continue;

        const dueValue = arrear.dueDate || arrear.month;
        const dueDate = dueValue ? new Date(dueValue) : null;
        if (!dueDate || Number.isNaN(dueDate.getTime())) continue;
        dueDate.setHours(0, 0, 0, 0);

        const existing = balanceStatsByTenant.get(arrear.tenantId) || {
          arrearsBalance: 0,
          outstandingBalance: 0,
          oldestDue: null as Date | null,
        };

        if (isOverdueArrear(arrear, today)) {
          existing.arrearsBalance += balance;
          if (!existing.oldestDue || dueDate < existing.oldestDue) {
            existing.oldestDue = dueDate;
          }
        } else if (isOutstandingArrear(arrear, today)) {
          existing.outstandingBalance += balance;
        }

        balanceStatsByTenant.set(arrear.tenantId, existing);
      }

      return toSnake(
        (rows as any[]).map(({ unit, ...row }) => {
          const balances = balanceStatsByTenant.get(row.id);
          const arrearsBalance = balances?.arrearsBalance || 0;
          const outstandingBalance = balances?.outstandingBalance || 0;
          const oldestArrear = balances?.oldestDue || null;
          const daysInArrears = oldestArrear
            ? Math.max(0, Math.floor((today.getTime() - oldestArrear.getTime()) / 86400000))
            : 0;

          return {
            ...row,
            tenantId: row.id,
            tenantPhone: row.emergencyContact || null,
            phone: row.emergencyContact || null,
            rentAmount: unit?.rentAmount || 0,
            depositAmount: unit?.depositAmount || 0,
            rentDueDate: row.rentDueDate,
            unitNumber: unit?.unitNumber || "",
            unitType: unit?.type || "",
            floor: unit?.floor || "",
            unitStatus: unit?.status || "",
            propertyId: unit?.propertyId || null,
            propertyName: unit?.property?.name || "Unknown Property",
            blockId: unit?.blockId || null,
            blockName: unit?.block?.name || null,
            arrearsBalance,
            arrearsAmount: arrearsBalance,
            outstandingBalance,
            oldestArrearDueDate: oldestArrear || null,
            daysInArrears,
            lease_end_date: row.leaseEnd || null,
            monthRent: monthRentByTenant.get(row.id) || {},
          };
        }),
      );
    } catch (error) {
      handlePrismaError("v_tenant_overview", error);
    }
  }

  private async listArrearsWithDetails(tenant: TenantContext, query: Record<string, any>) {
    const where = this.query.buildWhere("arrears", tenant, query);
    where.status = { not: "waived" };
    const args: Record<string, any> = {
      where,
      include: {
        tenant: {
          include: {
            unit: {
              include: {
                property: { select: { id: true, name: true } },
                block: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    };

    if (query.orderBy) {
      args.orderBy = {
        [toCamel(query.orderBy)]: query.order === "desc" ? "desc" : "asc",
      };
    }

    this.query.applyPagination(args, query);

    try {
      const rows = await this.query.prisma.arrear.findMany(args as any);
      return toSnake(
        (rows as any[]).map(({ tenant: tenantRow, ...row }) => ({
          ...row,
          tenantName: tenantRow?.fullName || "Unknown",
          tenantEmail: tenantRow?.email || null,
          tenantPhone: tenantRow?.phone || tenantRow?.emergencyContact || null,
          tenantStatus: tenantRow?.status || null,
          tenantLeaseEnd: tenantRow?.leaseEnd || null,
          propertyId: tenantRow?.unit?.propertyId || null,
          propertyName: tenantRow?.unit?.property?.name || "N/A",
          blockId: tenantRow?.unit?.blockId || null,
          blockName: tenantRow?.unit?.block?.name || "N/A",
          unitId: tenantRow?.unitId || null,
          unitNumber: tenantRow?.unit?.unitNumber || "N/A",
          balance: Number(row.amountDue || 0) - Number(row.amountPaid || 0),
        })),
      );
    } catch (error) {
      handlePrismaError("v_arrears_with_details", error);
    }
  }

  private async listMaintenanceRequestsWithDetails(
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
    const where = this.query.buildWhere("maintenance_requests", tenant, query);
    const args: Record<string, any> = {
      where,
      include: {
        property: { select: { id: true, name: true } },
        block: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true } },
      },
    };

    if (query.orderBy) {
      args.orderBy = {
        [toCamel(query.orderBy)]: query.order === "desc" ? "desc" : "asc",
      };
    }

    this.query.applyPagination(args, query);

    try {
      const rows = await this.query.prisma.maintenanceRequest.findMany(args as any);
      return toSnake(
        (rows as any[]).map(({ property, block, unit, ...row }) => ({
          ...row,
          properties: property || null,
          blocks: block || null,
          units: unit || null,
        })),
      );
    } catch (error) {
      handlePrismaError("v_maintenance_requests_with_details", error);
    }
  }

  private async listOwnerAdvancesWithDetails(
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
    const where = this.query.buildWhere("owner_advances", tenant, query);
    const args: Record<string, any> = {
      where,
      include: {
        property: { select: { id: true, name: true } },
      },
    };

    if (query.orderBy) {
      args.orderBy = {
        [toCamel(query.orderBy)]: query.order === "desc" ? "desc" : "asc",
      };
    }

    this.query.applyPagination(args, query);

    try {
      const rows = await this.query.prisma.ownerAdvance.findMany(args as any);
      return toSnake(
        (rows as any[]).map(({ property, ...row }) => ({
          ...row,
          purpose: row.description || null,
          status: row.status || "disbursed",
          requestedDate: row.advanceDate,
          disbursedDate: row.advanceDate,
          maintenanceId: null,
          properties: property || null,
          maintenanceRequests: null,
        })),
      );
    } catch (error) {
      handlePrismaError("v_owner_advances_with_details", error);
    }
  }
}
