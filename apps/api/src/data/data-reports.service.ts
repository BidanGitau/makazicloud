import { Injectable } from "@nestjs/common";

import type { TenantContext } from "../tenancy/tenant-context";
import { PropertyAccessService } from "../tenancy/property-access.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  collectionMonthInRange,
  monthStart,
  parseQueryDate,
  paymentCollectionChunks,
  widenedPaymentDateFilter,
} from "./data.dates";
import { toNumber } from "./data.mappers";

@Injectable()
export class DataReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyAccess: PropertyAccessService,
  ) {}

  async list(table: string, tenant: TenantContext, query: Record<string, any>) {
    if (table === "v_property_statement_tenants" || table === "v_tenant_payment_overview") {
      return this.listPropertyStatementTenants(tenant, query);
    }
    if (table === "v_property_statement_summary") {
      return this.listPropertyStatementSummary(tenant, query);
    }
    if (table === "property_net_income") {
      return this.listPropertyNetIncome(tenant, query);
    }
    return null;
  }

  private async listPropertyStatementSummary(
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
    const rows = await this.listPropertyStatementTenants(tenant, query);
    const totals = (rows as any[]).reduce(
      (acc, row) => {
        acc.rent_collected += Number(row.rent_collected || 0);
        acc.arrears_paid += Number(row.arrears_paid || 0);
        acc.utilities_paid += Number(row.utilities_paid || 0);
        acc.utilities_billed += Number(row.utilities_billed || 0);
        acc.total_collected += Number(row.total_collected || 0);
        return acc;
      },
      {
        rent_collected: 0,
        arrears_paid: 0,
        utilities_paid: 0,
        utilities_billed: 0,
        total_collected: 0,
      },
    );

    return [
      {
        property_id: query.property_id || null,
        total_rent_collected: totals.rent_collected,
        total_arrears_paid: totals.arrears_paid,
        total_utilities_paid: totals.utilities_paid,
        total_utilities_billed: totals.utilities_billed,
        total_collected: totals.total_collected,
        ...totals,
      },
    ];
  }

  private async listPropertyStatementTenants(
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
    const propertyId = query.property_id || query.propertyId;
    const startDate = parseQueryDate(
      query["period_month[gte]"] || query["payment_date[gte]"],
    );
    const endDate = parseQueryDate(
      query["period_month[lte]"] || query["payment_date[lte]"],
      true,
    );
    const paymentDate = widenedPaymentDateFilter(startDate, endDate);

    const [payments, utilityBills] = await Promise.all([
      this.prisma.payment.findMany({
        where: this.propertyAccess.scopeWhere("payments", tenant, {
          organizationId: tenant.organizationId,
          ...(paymentDate ? { paymentDate } : {}),
          ...(propertyId
            ? {
                tenant: {
                  unit: {
                    propertyId,
                  },
                },
              }
            : {}),
        }),
        include: {
          allocations: true,
          tenant: {
            include: {
              unit: {
                include: {
                  property: { select: { id: true, name: true, rentDueDay: true } },
                  block: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { paymentDate: "asc" },
      }),
      this.prisma.utilityBill.findMany({
        where: this.propertyAccess.scopeWhere("utility_bills", tenant, {
          organizationId: tenant.organizationId,
          ...(propertyId ? { propertyId } : {}),
          ...(startDate || endDate
            ? {
                billingMonth: {
                  ...(startDate ? { gte: new Date(startDate) } : {}),
                  ...(endDate ? { lte: new Date(endDate) } : {}),
                },
              }
            : {}),
        }),
      }),
    ]);

    const grouped = new Map<string, any>();
    const groupedByUnit = new Map<string, any>();
    const ensureRow = (paymentTenant: any) => {
      const unit = paymentTenant?.unit;
      const key = paymentTenant?.id || "unknown";

      if (!grouped.has(key)) {
        grouped.set(key, {
          tenant_id: paymentTenant?.id || null,
          tenant_name: paymentTenant?.fullName || "Unknown",
          property_id: unit?.propertyId || null,
          property_name: unit?.property?.name || "N/A",
          block_id: unit?.blockId || null,
          block_name: unit?.block?.name || "N/A",
          unit_id: unit?.id || paymentTenant?.unitId || null,
          unit_number: unit?.unitNumber || "N/A",
          period_month: null,
          rent_collected: 0,
          arrears_paid: 0,
          utilities_paid: 0,
          utilities_billed: 0,
          total_collected: 0,
        });
      }

      const row = grouped.get(key);
      if (row.unit_id) groupedByUnit.set(row.unit_id, row);
      return row;
    };

    for (const payment of payments as any[]) {
      if (propertyId && payment.tenant?.unit?.propertyId !== propertyId) continue;

      const chunks = paymentCollectionChunks(payment).filter((chunk) =>
        collectionMonthInRange(chunk.month, startDate, endDate),
      );
      if (!chunks.length) continue;

      const row = ensureRow(payment.tenant);
      row.period_month ||= chunks[0].month;

      for (const chunk of chunks) {
        const amount = Number(chunk.amount || 0);
        const type = String(chunk.type || "").toLowerCase();

        if (type.includes("arrear")) row.arrears_paid += amount;
        else if (type.includes("util")) row.utilities_paid += amount;
        else row.rent_collected += amount;

        row.total_collected += amount;
      }
    }

    for (const bill of utilityBills as any[]) {
      if (!bill.unitId) continue;
      const row = groupedByUnit.get(bill.unitId);
      if (!row) continue;

      row.utilities_billed += Number(bill.totalAmount || 0);
      row.utilities_paid += Number(bill.paidAmount || 0);
      row.total_collected += Number(bill.paidAmount || 0);
    }

    return [...grouped.values()].sort((a, b) =>
      String(a.tenant_name).localeCompare(String(b.tenant_name)),
    );
  }

  private async listPropertyNetIncome(tenant: TenantContext, query: Record<string, any>) {
    const propertyId = query.property_id || query.propertyId;
    const blockId = query.block_id || query.blockId;
    const startDate = parseQueryDate(query.start_date || query.startDate);
    const endDate = parseQueryDate(query.end_date || query.endDate, true);
    const propertyWhere = this.propertyAccess.scopeWhere("properties", tenant, {
      organizationId: tenant.organizationId,
      ...(propertyId ? { id: propertyId } : {}),
    });

    const properties = await this.prisma.property.findMany({
      where: propertyWhere,
      select: { id: true, name: true, commissionRate: true },
    });
    const propertyIds = properties.map((property) => property.id);

    if (!propertyIds.length) return [];
    const maintenanceWhere: Record<string, any> = {
      organizationId: tenant.organizationId,
      propertyId: { in: propertyIds },
      ...(blockId ? { blockId } : {}),
    };
    const ownerAdvanceWhere: Record<string, any> = {
      organizationId: tenant.organizationId,
      propertyId: { in: propertyIds },
      status: { not: "cancelled" },
    };

    if (startDate || endDate) {
      maintenanceWhere.reportedDate = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
      ownerAdvanceWhere.advanceDate = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    const [maintenanceRequests, ownerAdvances, billedArrears] = await Promise.all([
      this.prisma.maintenanceRequest.findMany({
        where: maintenanceWhere,
      }),
      this.prisma.ownerAdvance.findMany({
        where: ownerAdvanceWhere,
      }),
      this.prisma.arrear.findMany({
        where: this.propertyAccess.scopeWhere("arrears", tenant, {
          organizationId: tenant.organizationId,
          status: { not: "waived" },
          ...(startDate || endDate
            ? {
                month: {
                  ...(startDate ? { gte: monthStart(startDate) } : {}),
                  ...(endDate ? { lte: monthStart(endDate) } : {}),
                },
              }
            : {}),
          tenant: {
            unit: {
              propertyId: { in: propertyIds },
              ...(blockId ? { blockId } : {}),
            },
          },
        }),
        select: {
          amountDue: true,
          amountPaid: true,
          status: true,
          tenant: {
            select: {
              unit: { select: { propertyId: true } },
            },
          },
        },
      }),
    ]);

    const rows = new Map(
      properties.map((property) => [
        property.id,
        {
          property_id: property.id,
          property_name: property.name,
          expected_rent: 0,
          total_collected: 0,
          commission_rate: toNumber(property.commissionRate),
          commission_amount: 0,
          expected_commission: 0,
          total_maintenance_cost: 0,
          total_advances: 0,
          net_income: 0,
          expected_payout: 0,
        },
      ]),
    );

    for (const request of maintenanceRequests as any[]) {
      const id = request.propertyId;
      if (!id || !rows.has(id)) continue;
      rows.get(id)!.total_maintenance_cost += toNumber(
        request.actualCost ?? request.estimatedCost ?? request.amount,
      );
    }

    for (const advance of ownerAdvances as any[]) {
      if (blockId) continue;
      const id = advance.propertyId;
      if (!id || !rows.has(id)) continue;
      rows.get(id)!.total_advances += toNumber(advance.amount);
    }

    for (const arrear of billedArrears as any[]) {
      const id = arrear.tenant?.unit?.propertyId;
      if (!id || !rows.has(id)) continue;
      if (String(arrear.status || "").toLowerCase() === "prepaid") continue;
      const billed = toNumber(arrear.amountDue);
      const paid = toNumber(arrear.amountPaid);
      if (billed > 0) rows.get(id)!.expected_rent += billed;
      if (paid > 0) rows.get(id)!.total_collected += paid;
    }

    return [...rows.values()].map((row) => {
      const commissionAmount = (row.total_collected * row.commission_rate) / 100;
      const expectedCommission = (row.expected_rent * row.commission_rate) / 100;
      const netIncome =
        row.total_collected - commissionAmount - row.total_maintenance_cost - row.total_advances;
      return {
        ...row,
        commission_amount: commissionAmount,
        expected_commission: expectedCommission,
        net_income: netIncome,
        expected_payout:
          row.expected_rent - expectedCommission - row.total_maintenance_cost - row.total_advances,
        can_disburse: row.total_collected > 0 ? Math.max(0, netIncome) : 0,
      };
    });
  }
}
