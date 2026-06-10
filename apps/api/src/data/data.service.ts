import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { getSubscriptionPlan } from "../billing/subscription-plans";
import { RentLedgerService } from "../rent-ledger/rent-ledger.service";
import { assertEmailFreeForTenant } from "../auth/email-uniqueness";


const TABLE_TO_MODEL: Record<string, string> = {
  properties: "property",
  blocks: "block",
  units: "unit",
  tenants: "tenant",
  payments: "payment",
  payment_allocations: "paymentAllocation",
  arrears: "arrear",
  maintenance_requests: "maintenanceRequest",
  owner_advances: "ownerAdvance",
  utility_unit_assignments: "utilityUnitAssignment",
  utility_meter_readings: "utilityMeterReading",
  utility_bills: "utilityBill",
  refunds: "refund",
};


const PROTECTED_WRITE_FIELDS = new Set([
  "id",
  "organizationId",
  "createdAt",
  "updatedAt",
]);


const PROTECTED_QUERY_KEYS = new Set(["organizationId"]);
const DEFAULT_LIST_LIMIT = 500;
const MAX_LIST_LIMIT = 1000;

const READ_ONLY_ALIASES: Record<string, string> = {
  v_tenant_overview: "tenant",
  tenant_details: "tenant",
  v_arrears_with_details: "arrear",
  dashboard_total_collection: "payment",
  dashboard_occupancy: "unit",
  dashboard_monthly_collection: "payment",
  dashboard_property_earnings: "payment",
  dashboard_tenant_status: "tenant",
  dashboard_customers_arrears: "arrear",
  v_property_statement: "payment",
  v_property_statement_tenants: "tenant",
  v_property_statement_summary: "payment",
  v_tenant_payment_overview: "payment",
  v_utility_bills_with_details: "utilityBill",
  v_maintenance_requests_with_details: "maintenanceRequest",
  v_owner_advances_with_details: "ownerAdvance",
};

@Injectable()
export class DataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentLedger: RentLedgerService,
  ) {}

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

    if (table === "v_property_statement_tenants" || table === "v_tenant_payment_overview") {
      return this.listPropertyStatementTenants(tenant, query);
    }

    if (table === "v_property_statement_summary") {
      return this.listPropertyStatementSummary(tenant, query);
    }

    if (table === "dashboard_overview") {
      return this.listDashboardOverview(tenant, query);
    }

    if (table === "dashboard_bundle") {
      return this.listDashboardBundle(tenant, query);
    }

    if (table === "property_net_income") {
      return this.listPropertyNetIncome(tenant, query);
    }

    const model = this.getModel(table);
    const where = this.buildWhere(tenant, query);
    const args: Record<string, any> = { where };

    if (query.orderBy) {
      args.orderBy = {
        [this.toCamel(query.orderBy)]: query.order === "desc" ? "desc" : "asc",
      };
    }

    this.applyPagination(args, query);

    try {
      return this.toSnake(await model.findMany(args));
    } catch (error) {
      this.handlePrismaError(table, error);
    }
  }

  async get(table: string, tenant: TenantContext, id: string) {
    const model = this.getModel(table);
    const row = await model.findFirst({
      where: { id, organizationId: tenant.organizationId },
    });

    if (!row) throw new NotFoundException(`${table} row was not found`);
    return this.toSnake(row);
  }

  async create(table: string, tenant: TenantContext, body: Record<string, any>) {
    const model = this.getModel(table);
    const data = this.stripProtectedFields(this.toCamelDeep(body));
    if (table === "properties") {
      await this.ensurePropertyLimitAllowsCreate(tenant);
    }

    if (table === "units") {
      data.status = String(data.status || "vacant").toLowerCase();
      await this.ensureUnitCapacityAllowsCreate(tenant, data);
    }

    if (table === "tenants") {
      await this.ensureTenantUnitIsAvailable(tenant, data.unitId);


      if (data.email) {
        await assertEmailFreeForTenant(this.prisma, data.email, {
          organizationId: tenant.organizationId,
        });
      }
    }

    try {
      const row = await model.create({
        data: {
          ...data,
          organizationId: tenant.organizationId,
        },
      });

      if (table === "tenants") {
        await this.markUnitStatus(tenant, data.unitId, "occupied");
      }

      if (table === "payments") {
        await this.rentLedger.applyPayment(tenant, row);
      }

      return this.toSnake(row);
    } catch (error) {
      this.handlePrismaError(table, error);
    }
  }

  async update(
    table: string,
    tenant: TenantContext,
    id: string,
    body: Record<string, any>,
  ) {
    const model = this.getModel(table);
    const existingRow = await this.get(table, tenant, id);
    const data = this.stripProtectedFields(this.toCamelDeep(body));
    if (table === "units" && data.status !== undefined) {
      data.status = String(data.status || "vacant").toLowerCase();
    }

    if (table === "tenants") {
      await this.ensureTenantUnitIsAvailable(tenant, data.unitId, id);


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
        where: { id, organizationId: tenant.organizationId },
        data,
      });
      if (result.count === 0) {
        throw new NotFoundException(`${table} row was not found`);
      }
      const row = await model.findFirst({
        where: { id, organizationId: tenant.organizationId },
      });

      if (table === "tenants") {
        const nextStatus = String(data.status ?? row?.status ?? "").toLowerCase();
        if (nextStatus === "inactive") {
          await this.markUnitStatus(tenant, data.unitId || existingRow.unit_id, "vacant");
        } else {
          await this.markUnitStatus(tenant, data.unitId, "occupied");
        }
      }

      if (
        table === "properties" &&
        data.rentDueDay !== undefined &&
        Number(data.rentDueDay) !== Number(existingRow.rent_due_day ?? 5)
      ) {
        await this.syncPropertyArrearDueDates(
          tenant,
          id,
          Number(data.rentDueDay) || 5,
        );
      }

      return this.toSnake(row);
    } catch (error) {
      this.handlePrismaError(table, error);
    }
  }

  async remove(table: string, tenant: TenantContext, id: string) {
    const model = this.getModel(table);
    const existingRow = table === "tenants" ? await this.get(table, tenant, id) : null;
    const result = await model.deleteMany({
      where: { id, organizationId: tenant.organizationId },
    });
    if (result.count === 0) {
      throw new NotFoundException(`${table} row was not found`);
    }
    if (table === "tenants") {
      await this.markUnitStatus(tenant, existingRow?.unit_id, "vacant");
    }
    return { ok: true };
  }

  private stripProtectedFields(data: Record<string, any>) {
    for (const field of PROTECTED_WRITE_FIELDS) {
      delete data[field];
    }
    return data;
  }

  private getModel(table: string) {
    const modelName = TABLE_TO_MODEL[table] || READ_ONLY_ALIASES[table];
    if (!modelName) throw new BadRequestException(`Unsupported table: ${table}`);

    const model = (this.prisma as any)[modelName];
    if (!model) throw new BadRequestException(`Unsupported model: ${modelName}`);
    return model;
  }

  private async ensureTenantUnitIsAvailable(
    tenant: TenantContext,
    unitId?: string | null,
    currentTenantId?: string,
  ) {
    if (!unitId) return;

    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, organizationId: tenant.organizationId },
      select: { id: true, status: true },
    });

    if (!unit) throw new BadRequestException("Selected unit was not found");

    const assignedTenant = await this.prisma.tenant.findFirst({
      where: {
        organizationId: tenant.organizationId,
        unitId,
        ...(currentTenantId ? { id: { not: currentTenantId } } : {}),
        status: { in: ["active", "Active"] },
      },
      select: { id: true },
    });

    if (assignedTenant) {
      throw new BadRequestException("Selected unit is already assigned to an active tenant");
    }

    const status = String(unit.status || "").toLowerCase();
    if (!["vacant", "available"].includes(status) && !currentTenantId) {
      throw new BadRequestException("Selected unit is not vacant");
    }
  }

  private async ensureUnitCapacityAllowsCreate(
    tenant: TenantContext,
    data: Record<string, any>,
  ) {
    const propertyId = data.propertyId;
    if (!propertyId) {
      throw new BadRequestException("Unit must be linked to a property");
    }

    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId: tenant.organizationId },
      select: { id: true, name: true, unitCount: true },
    });

    if (!property) {
      throw new BadRequestException("Selected property was not found");
    }

    if (property.unitCount != null) {
      const existing = await this.prisma.unit.count({
        where: { propertyId, organizationId: tenant.organizationId },
      });
      if (existing >= property.unitCount) {
        throw new BadRequestException(
          `${property.name} is configured for ${property.unitCount} unit${
            property.unitCount === 1 ? "" : "s"
          }. Increase the property's unit count before adding more.`,
        );
      }
    }

    const blockId = data.blockId;
    if (!blockId) return;

    const block = await this.prisma.block.findFirst({
      where: { id: blockId, organizationId: tenant.organizationId },
      select: { id: true, name: true, unitCount: true },
    });

    if (!block) {
      throw new BadRequestException("Selected block was not found");
    }

    if (block.unitCount != null) {
      const existing = await this.prisma.unit.count({
        where: { blockId, organizationId: tenant.organizationId },
      });
      if (existing >= block.unitCount) {
        throw new BadRequestException(
          `Block ${block.name} is configured for ${block.unitCount} unit${
            block.unitCount === 1 ? "" : "s"
          }. Increase the block's unit count before adding more.`,
        );
      }
    }
  }

  private async ensurePropertyLimitAllowsCreate(tenant: TenantContext) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenant.organizationId },
      select: { subscriptionPlan: true },
    });
    const plan = getSubscriptionPlan(organization?.subscriptionPlan);
    const propertyLimit = plan.limits.properties;

    if (propertyLimit === null) return;

    const propertyCount = await this.prisma.property.count({
      where: { organizationId: tenant.organizationId },
    });

    if (propertyCount >= propertyLimit) {
      throw new BadRequestException(
        `${plan.name} plan allows ${propertyLimit} ${propertyLimit === 1 ? "property" : "properties"}. Upgrade your subscription to onboard more properties.`,
      );
    }
  }

  private async markUnitStatus(
    tenant: TenantContext,
    unitId?: string | null,
    status = "occupied",
  ) {
    if (!unitId) return;

    await this.prisma.unit.updateMany({
      where: { id: unitId, organizationId: tenant.organizationId },
      data: { status },
    });
  }

  private async applyPaymentToRentLedger(tenant: TenantContext, payment: any) {
    let remaining = this.toNumber(payment.amount);
    if (remaining <= 0 || !payment.tenantId) return;

    const tenantRow = await this.prisma.tenant.findFirst({
      where: {
        id: payment.tenantId,
        organizationId: tenant.organizationId,
      },
      include: {
        unit: {
          include: {
            property: {
              select: {
                rentDueDay: true,
              },
            },
          },
        },
      },
    });

    if (!tenantRow?.unit) return;

    const rentAmount = this.toNumber(tenantRow.unit.rentAmount);
    if (rentAmount <= 0) return;

    const paymentMonth = this.monthStart(new Date(payment.paymentDate || new Date()));
    await this.ensureTenantArrearMonths(tenant.organizationId, tenantRow, paymentMonth);

    const openRows = await this.prisma.arrear.findMany({
      where: {
        organizationId: tenant.organizationId,
        tenantId: tenantRow.id,
        status: { in: ["pending", "partial"] },
      },
      orderBy: { month: "asc" },
    });

    for (const row of openRows as any[]) {
      if (remaining <= 0) break;

      const balance = Math.max(
        0,
        this.toNumber(row.amountDue) - this.toNumber(row.amountPaid),
      );
      if (balance <= 0) continue;

      const applied = Math.min(remaining, balance);
      const nextPaid = this.toNumber(row.amountPaid) + applied;
      const nextStatus = nextPaid >= this.toNumber(row.amountDue) ? "cleared" : "partial";

      await this.prisma.arrear.update({
        where: { id: row.id },
        data: {
          amountPaid: nextPaid,
          status: nextStatus,
        },
      });

      await this.prisma.paymentAllocation.create({
        data: {
          organizationId: tenant.organizationId,
          paymentId: payment.id,
          tenantId: tenantRow.id,
          allocationType: row.month < paymentMonth ? "arrears" : "rent",
          referenceId: row.id,
          leaseMonth: row.month,
          amount: applied,
          status: "applied",
        },
      });

      remaining -= applied;
    }

    let creditMonth = this.addMonths(paymentMonth, 1);
    while (remaining > 0) {
      const existing = await this.prisma.arrear.findFirst({
        where: {
          organizationId: tenant.organizationId,
          tenantId: tenantRow.id,
          month: creditMonth,
        },
      });

      const existingCredit =
        existing && String(existing.status || "").toLowerCase() === "prepaid"
          ? this.toNumber(existing.amountPaid)
          : 0;
      const creditCapacity = Math.max(0, rentAmount - existingCredit);
      if (existing && creditCapacity <= 0) {
        creditMonth = this.addMonths(creditMonth, 1);
        continue;
      }

      const applied = Math.min(remaining, creditCapacity || rentAmount);
      const prepaidRow = existing
        ? await this.prisma.arrear.update({
            where: { id: existing.id },
            data: {
              amountPaid: this.toNumber(existing.amountPaid) + applied,
              status: "prepaid",
            },
          })
        : await this.prisma.arrear.create({
            data: {
              organizationId: tenant.organizationId,
              tenantId: tenantRow.id,
              month: creditMonth,
              amountDue: 0,
              amountPaid: applied,
              status: "prepaid",
              dueDate: this.dueDateForMonth(
                creditMonth,
                tenantRow.unit.property?.rentDueDay ?? tenantRow.rentDueDate,
              ),
            },
          });

      await this.prisma.paymentAllocation.create({
        data: {
          organizationId: tenant.organizationId,
          paymentId: payment.id,
          tenantId: tenantRow.id,
          allocationType: "prepaid",
          referenceId: prepaidRow.id,
          leaseMonth: creditMonth,
          amount: applied,
          status: "applied",
        },
      });

      remaining -= applied;
      creditMonth = this.addMonths(creditMonth, 1);
    }
  }

  private async ensureTenantArrearMonths(
    organizationId: string,
    tenantRow: any,
    throughMonth: Date,
  ) {
    if (!tenantRow?.unit) return;

    const rentAmount = this.toNumber(tenantRow.unit.rentAmount);
    if (rentAmount <= 0) return;

    const startMonth = this.monthStart(new Date(tenantRow.leaseStart || throughMonth));
    const endMonth = this.monthStart(throughMonth);

    for (
      let month = startMonth;
      month <= endMonth;
      month = this.addMonths(month, 1)
    ) {
      const existing = await this.prisma.arrear.findFirst({
        where: {
          organizationId,
          tenantId: tenantRow.id,
          month,
        },
      });

      if (!existing) {
        await this.prisma.arrear.create({
          data: {
            organizationId,
            tenantId: tenantRow.id,
            month,
            amountDue: rentAmount,
            amountPaid: 0,
            status: "pending",
            dueDate: this.dueDateForMonth(
              month,
              tenantRow.unit.property?.rentDueDay ?? tenantRow.rentDueDate,
            ),
          },
        });
        continue;
      }

      if (String(existing.status || "").toLowerCase() === "prepaid") {
        const paid = this.toNumber(existing.amountPaid);
        await this.prisma.arrear.update({
          where: { id: existing.id },
          data: {
            amountDue: rentAmount,
            status: paid >= rentAmount ? "cleared" : paid > 0 ? "partial" : "pending",
          },
        });
      }
    }
  }

  private async listUtilityBillsWithDetails(
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
    const where = this.buildWhere(tenant, query);
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
        [this.toCamel(query.orderBy)]: query.order === "desc" ? "desc" : "asc",
      };
    }

    this.applyPagination(args, query);

    try {
      const rows = await this.prisma.utilityBill.findMany(args as any);
      return this.toSnake(
        (rows as any[]).map(({ property, block, unit, ...row }) => ({
          ...row,
          propertyName: property?.name || null,
          blockName: block?.name || null,
          unitNumber: unit?.unitNumber || null,
        })),
      );
    } catch (error) {
      this.handlePrismaError("v_utility_bills_with_details", error);
    }
  }

  private async listTenantOverview(tenant: TenantContext, query: Record<string, any>) {
    const normalizedQuery = { ...query };
    if (normalizedQuery.tenant_id) {
      normalizedQuery.id = normalizedQuery.tenant_id;
      delete normalizedQuery.tenant_id;
    }

    const where = this.buildWhere(tenant, normalizedQuery);
    const args: Record<string, any> = {
      where,
      include: {
        unit: {
          include: {
            property: { select: { id: true, name: true } },
            block: { select: { id: true, name: true } },
          },
        },
        arrears: {
          select: {
            month: true,
            amountDue: true,
            amountPaid: true,
            status: true,
          },
        },
      },
    };

    if (normalizedQuery.orderBy) {
      args.orderBy = {
        [this.toCamel(normalizedQuery.orderBy)]:
          normalizedQuery.order === "desc" ? "desc" : "asc",
      };
    }

    this.applyPagination(args, normalizedQuery);

    try {
      const rows = await this.prisma.tenant.findMany(args as any);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return this.toSnake(
        (rows as any[]).map(({ unit, arrears, ...row }) => {
          const activeArrears = (arrears || []).filter((arrear: any) =>
            ["pending", "partial"].includes(String(arrear.status || "").toLowerCase()),
          );
          const arrearsBalance = activeArrears.reduce(
            (sum: number, arrear: any) =>
              sum + Math.max(0, Number(arrear.amountDue || 0) - Number(arrear.amountPaid || 0)),
            0,
          );
          const oldestArrear = activeArrears
            .map((arrear: any) => arrear.month)
            .filter(Boolean)
            .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];
          const daysInArrears = oldestArrear
            ? Math.max(0, Math.floor((today.getTime() - oldestArrear.getTime()) / 86400000))
            : 0;

          return {
            ...row,
            tenantId: row.id,
            rentAmount: unit?.rentAmount || 0,
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
            oldestArrearDueDate: oldestArrear || null,
            daysInArrears,
          };
        }),
      );
    } catch (error) {
      this.handlePrismaError("v_tenant_overview", error);
    }
  }

  private async listArrearsWithDetails(tenant: TenantContext, query: Record<string, any>) {
    const where = this.buildWhere(tenant, query);
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
        [this.toCamel(query.orderBy)]: query.order === "desc" ? "desc" : "asc",
      };
    }

    this.applyPagination(args, query);

    try {
      const rows = await this.prisma.arrear.findMany(args as any);
      return this.toSnake(
        (rows as any[]).map(({ tenant: tenantRow, ...row }) => ({
          ...row,
          tenantName: tenantRow?.fullName || "Unknown",
          tenantEmail: tenantRow?.email || null,
          tenantPhone: tenantRow?.phone || tenantRow?.emergencyContact || null,
          tenantStatus: tenantRow?.status || null,
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
      this.handlePrismaError("v_arrears_with_details", error);
    }
  }

  private async listMaintenanceRequestsWithDetails(
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
    const where = this.buildWhere(tenant, query);
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
        [this.toCamel(query.orderBy)]: query.order === "desc" ? "desc" : "asc",
      };
    }

    this.applyPagination(args, query);

    try {
      const rows = await this.prisma.maintenanceRequest.findMany(args as any);
      return this.toSnake(
        (rows as any[]).map(({ property, block, unit, ...row }) => ({
          ...row,
          properties: property || null,
          blocks: block || null,
          units: unit || null,
        })),
      );
    } catch (error) {
      this.handlePrismaError("v_maintenance_requests_with_details", error);
    }
  }

  private async listOwnerAdvancesWithDetails(
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
    const where = this.buildWhere(tenant, query);
    const args: Record<string, any> = {
      where,
      include: {
        property: { select: { id: true, name: true } },
      },
    };

    if (query.orderBy) {
      args.orderBy = {
        [this.toCamel(query.orderBy)]: query.order === "desc" ? "desc" : "asc",
      };
    }

    this.applyPagination(args, query);

    try {
      const rows = await this.prisma.ownerAdvance.findMany(args as any);
      return this.toSnake(
        (rows as any[]).map(({ property, ...row }) => ({
          ...row,
          purpose: row.description || null,
          status: "disbursed",
          requestedDate: row.advanceDate,
          disbursedDate: row.advanceDate,
          maintenanceId: null,
          properties: property || null,
          maintenanceRequests: null,
        })),
      );
    } catch (error) {
      this.handlePrismaError("v_owner_advances_with_details", error);
    }
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
    const startDate = query["period_month[gte]"] || query["payment_date[gte]"];
    const endDate = query["period_month[lte]"] || query["payment_date[lte]"];
    const paymentDate: Record<string, Date> = {};

    if (startDate) paymentDate.gte = new Date(startDate);
    if (endDate) paymentDate.lte = new Date(endDate);

    const [payments, utilityBills] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          organizationId: tenant.organizationId,
          ...(Object.keys(paymentDate).length ? { paymentDate } : {}),
        },
        include: {
          allocations: true,
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
        orderBy: { paymentDate: "asc" },
      }),
      this.prisma.utilityBill.findMany({
        where: {
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
        },
      }),
    ]);

    const grouped = new Map<string, any>();
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

      return grouped.get(key);
    };

    for (const payment of payments as any[]) {
      if (propertyId && payment.tenant?.unit?.propertyId !== propertyId) continue;

      const row = ensureRow(payment.tenant);
      row.period_month ||= this.monthStart(payment.paymentDate);

      if (payment.allocations?.length) {
        for (const allocation of payment.allocations) {
          const amount = Number(allocation.amount || 0);
          const type = String(allocation.allocationType || "").toLowerCase();

          if (type.includes("arrear")) row.arrears_paid += amount;
          else if (type.includes("util")) row.utilities_paid += amount;
          else row.rent_collected += amount;

          row.total_collected += amount;
        }
      } else {
        const amount = Number(payment.amount || 0);
        row.rent_collected += amount;
        row.total_collected += amount;
      }
    }

    for (const bill of utilityBills as any[]) {
      if (!bill.unitId) continue;
      const row = [...grouped.values()].find((item) => item.unit_id === bill.unitId);
      if (!row) continue;

      row.utilities_billed += Number(bill.totalAmount || 0);
      row.utilities_paid += Number(bill.paidAmount || 0);
      row.total_collected += Number(bill.paidAmount || 0);
    }

    return [...grouped.values()].sort((a, b) =>
      String(a.tenant_name).localeCompare(String(b.tenant_name)),
    );
  }

  private async listDashboardOverview(tenant: TenantContext, query: Record<string, any>) {
    const propertyId = query.property_id || query.propertyId;
    const blockId = query.block_id || query.blockId;
    const startDate = this.parseQueryDate(query.start_date || query.startDate);
    const endDate = this.parseQueryDate(query.end_date || query.endDate, true);
    const propertyWhere = {
      organizationId: tenant.organizationId,
      ...(propertyId ? { id: propertyId } : {}),
    };
    const paymentWhere: Record<string, any> = {
      organizationId: tenant.organizationId,
    };
    const arrearWhere: Record<string, any> = {
      organizationId: tenant.organizationId,
      status: { in: ["pending", "partial"] },
      AND: [this.dueArrearDateFilter(startDate, endDate)],
    };

    if (startDate || endDate) {
      paymentWhere.paymentDate = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    const [properties, payments, arrears] = await Promise.all([
      this.prisma.property.findMany({
        where: propertyWhere,
        include: {
          units: {
            where: blockId ? { blockId } : undefined,
            include: {
              tenants: true,
            },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: paymentWhere,
        include: {
          tenant: {
            include: {
              unit: true,
            },
          },
        },
      }),
      this.prisma.arrear.findMany({
        where: arrearWhere,
        include: {
          tenant: {
            include: {
              unit: true,
            },
          },
        },
      }),
    ]);

    const totals = new Map<string, { collected: number; outstanding: number }>();
    for (const property of properties) {
      totals.set(property.id, { collected: 0, outstanding: 0 });
    }

    for (const payment of payments as any[]) {
      const id = payment.tenant?.unit?.propertyId;
      if (blockId && payment.tenant?.unit?.blockId !== blockId) continue;
      if (!id || !totals.has(id)) continue;
      totals.get(id)!.collected += this.toNumber(payment.amount);
    }

    for (const arrear of arrears as any[]) {
      const id = arrear.tenant?.unit?.propertyId;
      if (blockId && arrear.tenant?.unit?.blockId !== blockId) continue;
      if (!id || !totals.has(id)) continue;
      totals.get(id)!.outstanding += Math.max(
        0,
        this.toNumber(arrear.amountDue) - this.toNumber(arrear.amountPaid),
      );
    }

    return properties.map((property: any) => {
      const units = property.units || [];
      const activeTenants = units.flatMap((unit: any) =>
        (unit.tenants || []).filter((tenantRow: any) =>
          String(tenantRow.status || "").toLowerCase() === "active",
        ),
      );
      const occupiedUnits = units.filter((unit: any) => {
        const status = String(unit.status || "").toLowerCase();
        return status === "occupied" || (unit.tenants || []).some((tenantRow: any) =>
          String(tenantRow.status || "").toLowerCase() === "active",
        );
      }).length;
      const total = totals.get(property.id) || { collected: 0, outstanding: 0 };
      const collectionBase = total.collected + total.outstanding;

      return {
        property_id: property.id,
        property_name: property.name,
        total_units: units.length,
        active_tenants: activeTenants.length,
        occupied_units: occupiedUnits,
        occupancy_rate: units.length ? (occupiedUnits / units.length) * 100 : 0,
        total_collected: total.collected,
        total_outstanding: total.outstanding,
        collection_rate: collectionBase ? (total.collected / collectionBase) * 100 : 0,
      };
    });
  }


  private async listDashboardBundle(
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
    const overview = await this.listDashboardOverview(tenant, query);

    const [properties, payments, arrears] = await Promise.all([
      this.prisma.property.findMany({
        where: { organizationId: tenant.organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.payment.findMany({
        where: { organizationId: tenant.organizationId },
        select: {
          amount: true,
          paymentDate: true,
          tenant: { select: { unit: { select: { propertyId: true } } } },
        },
      }),
      this.prisma.arrear.findMany({
        where: {
          organizationId: tenant.organizationId,
          status: { in: ["pending", "partial"] },
          AND: [this.dueArrearDateFilter()],
        },
        select: {
          amountDue: true,
          amountPaid: true,
          month: true,
          tenant: { select: { unit: { select: { propertyId: true } } } },
        },
      }),
    ]);

    const yearSet = new Set<number>([new Date().getFullYear()]);
    type Bucket = { collected: number; outstanding: number };
    const monthly = new Map<string, Bucket>();

    const key = (propertyId: string, year: number, month: number) =>
      `${propertyId}|${year}|${month}`;

    for (const payment of payments) {
      const propertyId = payment.tenant?.unit?.propertyId;
      if (!propertyId || !payment.paymentDate) continue;
      const d = new Date(payment.paymentDate);
      yearSet.add(d.getFullYear());
      const k = key(propertyId, d.getFullYear(), d.getMonth());
      const bucket = monthly.get(k) || { collected: 0, outstanding: 0 };
      bucket.collected += this.toNumber(payment.amount);
      monthly.set(k, bucket);
    }

    for (const arrear of arrears) {
      const propertyId = arrear.tenant?.unit?.propertyId;
      if (!propertyId || !arrear.month) continue;
      const d = new Date(arrear.month);
      yearSet.add(d.getFullYear());
      const k = key(propertyId, d.getFullYear(), d.getMonth());
      const bucket = monthly.get(k) || { collected: 0, outstanding: 0 };
      bucket.outstanding += Math.max(
        0,
        this.toNumber(arrear.amountDue) - this.toNumber(arrear.amountPaid),
      );
      monthly.set(k, bucket);
    }

    const monthlyAggregates = [...monthly.entries()].map(([k, bucket]) => {
      const [propertyId, year, month] = k.split("|");
      return {
        property_id: propertyId,
        year: Number(year),
        month: Number(month),
        collected: bucket.collected,
        outstanding: bucket.outstanding,
      };
    });

    return {
      overview,
      properties: properties.map((p) => ({ id: p.id, name: p.name })),
      available_years: [...yearSet].sort((a, b) => b - a),
      monthly_aggregates: monthlyAggregates,
    };
  }

  private async listPropertyNetIncome(tenant: TenantContext, query: Record<string, any>) {
    const propertyId = query.property_id || query.propertyId;
    const blockId = query.block_id || query.blockId;
    const startDate = this.parseQueryDate(query.start_date || query.startDate);
    const endDate = this.parseQueryDate(query.end_date || query.endDate, true);
    const propertyWhere = {
      organizationId: tenant.organizationId,
      ...(propertyId ? { id: propertyId } : {}),
    };

    const properties = await this.prisma.property.findMany({
      where: propertyWhere,
      select: { id: true, name: true, commissionRate: true },
    });
    const propertyIds = properties.map((property) => property.id);

    if (!propertyIds.length) return [];
    const paymentWhere: Record<string, any> = {
      organizationId: tenant.organizationId,
    };
    const maintenanceWhere: Record<string, any> = {
      organizationId: tenant.organizationId,
      propertyId: { in: propertyIds },
      ...(blockId ? { blockId } : {}),
    };
    const ownerAdvanceWhere: Record<string, any> = {
      organizationId: tenant.organizationId,
      propertyId: { in: propertyIds },
    };

    if (startDate || endDate) {
      paymentWhere.paymentDate = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
      maintenanceWhere.reportedDate = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
      ownerAdvanceWhere.advanceDate = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    const [payments, maintenanceRequests, ownerAdvances] = await Promise.all([
      this.prisma.payment.findMany({
        where: paymentWhere,
        include: {
          tenant: {
            include: {
              unit: true,
            },
          },
        },
      }),
      this.prisma.maintenanceRequest.findMany({
        where: maintenanceWhere,
      }),
      this.prisma.ownerAdvance.findMany({
        where: ownerAdvanceWhere,
      }),
    ]);

    const rows = new Map(
      properties.map((property) => [
        property.id,
        {
          property_id: property.id,
          property_name: property.name,
          total_collected: 0,
          commission_rate: this.toNumber(property.commissionRate),
          commission_amount: 0,
          total_maintenance_cost: 0,
          total_advances: 0,
          net_income: 0,
        },
      ]),
    );

    for (const payment of payments as any[]) {
      const id = payment.tenant?.unit?.propertyId;
      if (blockId && payment.tenant?.unit?.blockId !== blockId) continue;
      if (!id || !rows.has(id)) continue;
      rows.get(id)!.total_collected += this.toNumber(payment.amount);
    }

    for (const request of maintenanceRequests as any[]) {
      const id = request.propertyId;
      if (!id || !rows.has(id)) continue;
      rows.get(id)!.total_maintenance_cost += this.toNumber(
        request.actualCost ?? request.estimatedCost ?? request.amount,
      );
    }

    for (const advance of ownerAdvances as any[]) {
      if (blockId) continue;
      const id = advance.propertyId;
      if (!id || !rows.has(id)) continue;
      rows.get(id)!.total_advances += this.toNumber(advance.amount);
    }

    return [...rows.values()].map((row) => ({
      ...row,
      commission_amount: (row.total_collected * row.commission_rate) / 100,
      net_income:
        row.total_collected -
        (row.total_collected * row.commission_rate) / 100 -
        row.total_maintenance_cost -
        row.total_advances,
    }));
  }

  private parseQueryDate(value: any, endOfDay = false) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    if (endOfDay) {
      parsed.setUTCHours(23, 59, 59, 999);
    } else {
      parsed.setUTCHours(0, 0, 0, 0);
    }
    return parsed;
  }

  private dueArrearDateFilter(startDate: Date | null = null, endDate: Date | null = null) {
    const today = new Date();
    const cutoff = endDate && endDate < today ? endDate : today;
    const dateRange = {
      ...(startDate ? { gte: startDate } : {}),
      lte: cutoff,
    };

    return {
      OR: [
        { dueDate: dateRange },
        {
          dueDate: null,
          month: dateRange,
        },
      ],
    };
  }

  private monthStart(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  }

  private addMonths(value: Date, months: number) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
  }

  private dueDateForMonth(month: Date, dueDay?: number | null) {
    const normalizedDueDay = Number(dueDay || 5);
    const monthEndDay = new Date(
      Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
    ).getUTCDate();

    return new Date(
      Date.UTC(
        month.getUTCFullYear(),
        month.getUTCMonth(),
        Math.min(Math.max(1, normalizedDueDay), monthEndDay),
      ),
    );
  }

  private async syncPropertyArrearDueDates(
    tenant: TenantContext,
    propertyId: string,
    dueDay: number,
  ) {
    const arrears = await this.prisma.arrear.findMany({
      where: {
        organizationId: tenant.organizationId,
        status: { in: ["pending", "partial", "prepaid"] },
        tenant: {
          unit: {
            propertyId,
          },
        },
      },
      select: { id: true, month: true },
    });

    await Promise.all(
      arrears.map((arrear) =>
        this.prisma.arrear.update({
          where: { id: arrear.id },
          data: {
            dueDate: this.dueDateForMonth(new Date(arrear.month), dueDay),
          },
        }),
      ),
    );
  }

  private toNumber(value: any) {
    if (value === null || value === undefined || value === "") return 0;
    return Number(value) || 0;
  }

  private applyPagination(args: Record<string, any>, query: Record<string, any>) {
    const requestedLimit = Number(query.limit ?? DEFAULT_LIST_LIMIT);
    const requestedOffset = Number(query.offset ?? 0);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(1, Math.floor(requestedLimit)), MAX_LIST_LIMIT)
      : DEFAULT_LIST_LIMIT;
    const offset = Number.isFinite(requestedOffset)
      ? Math.max(0, Math.floor(requestedOffset))
      : 0;

    args.take = limit;
    if (offset > 0) args.skip = offset;
  }

  private buildWhere(tenant: TenantContext, query: Record<string, any>) {
    const where: Record<string, any> = {};

    Object.entries(query).forEach(([rawKey, value]) => {
      if (["orderBy", "order", "limit", "offset"].includes(rawKey)) return;
      if (value === undefined || value === null || value === "") return;

      const match = rawKey.match(/^(.+)\[(.+)\]$/);
      const key = this.toCamel(match?.[1] || rawKey);
      const operator = match?.[2];


      if (PROTECTED_QUERY_KEYS.has(key)) return;

      if (!operator) {
        where[key] = this.coerceValue(value, undefined, key);
        return;
      }

      where[key] = {
        ...(where[key] || {}),
        [this.operatorToPrisma(operator)]: this.coerceValue(value, operator, key),
      };
    });


    where.organizationId = tenant.organizationId;
    return where;
  }

  private operatorToPrisma(operator: string) {
    const normalized = operator.toLowerCase();
    if (normalized === "neq") return "not";
    if (normalized === "like" || normalized === "ilike") return "contains";
    return normalized;
  }

  private coerceValue(value: any, operator?: string, key?: string) {
    if (typeof value !== "string") return value;
    if (operator?.toLowerCase() === "in") {
      return value
        .split(",")
        .filter(Boolean)
        .map((item) => this.normalizeQueryValue(key, item));
    }
    if (value.includes(",")) return value.split(",");
    if (value === "true") return true;
    if (value === "false") return false;
    return this.normalizeQueryValue(key, value);
  }

  private normalizeQueryValue(key: string | undefined, value: string) {
    if (
      key &&
      /(?:Date|Month|leaseStart|advanceDate|month)$/i.test(key) &&
      /^\d{4}-\d{2}(-\d{2})?/.test(value)
    ) {
      return new Date(value.length === 7 ? `${value}-01` : value);
    }

    return value;
  }

  private toCamel(value: string) {
    return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private toSnake(value: any): any {
    if (Array.isArray(value)) return value.map((item) => this.toSnake(item));
    if (!value || typeof value !== "object" || value instanceof Date) return value;
    if (Prisma.Decimal.isDecimal(value)) return Number(value);

    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
        this.toSnake(val),
      ]),
    );
  }

  private toCamelDeep(value: any): any {
    if (Array.isArray(value)) return value.map((item) => this.toCamelDeep(item));
    if (!value || typeof value !== "object" || value instanceof Date) return value;

    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => {
        const camelKey = this.toCamel(key);
        return [camelKey, this.normalizeInputValue(camelKey, this.toCamelDeep(val))];
      }),
    );
  }

  private normalizeInputValue(key: string, value: any) {
    if (value === "" || value === undefined) return null;
    if (value === null) return null;

    if (
      typeof value === "string" &&
      /(?:Date|Month|leaseStart|advanceDate|month)$/i.test(key) &&
      /^\d{4}-\d{2}(-\d{2})?/.test(value)
    ) {
      return new Date(value.length === 7 ? `${value}-01` : value);
    }

    return value;
  }

  private handlePrismaError(table: string, error: unknown): never {
    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new BadRequestException(`${table} payload is invalid`);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new BadRequestException(`${table} row already exists`);
      }
      if (error.code === "P2003") {
        throw new BadRequestException(`${table} references a missing row`);
      }
    }

    throw error;
  }
}
