import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { PropertyAccessService } from "../tenancy/property-access.service";
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
  owner_settlements: "ownerSettlement",
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
    private readonly propertyAccess: PropertyAccessService,
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
    const where = this.buildWhere(table, tenant, query);
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
      where: this.propertyAccess.scopeWhere(table, tenant, {
        id,
        organizationId: tenant.organizationId,
      }),
    });

    if (!row) throw new NotFoundException(`${table} row was not found`);
    return this.toSnake(row);
  }

  async create(table: string, tenant: TenantContext, body: Record<string, any>) {
    const model = this.getModel(table);
    const data = this.stripProtectedFields(this.toCamelDeep(body));
    await this.propertyAccess.assertWritableReferences(tenant, data);
    if (table === "properties") {
      await this.ensurePropertyLimitAllowsCreate(tenant);
    }

    if (table === "units") {
      data.status = String(data.status || "vacant").toLowerCase();
      await this.ensureUnitCapacityAllowsCreate(tenant, data);
    }

    if (table === "tenants") {
      data.openingBalance = this.toNumber(data.openingBalance);
      await this.ensureTenantUnitIsAvailable(tenant, data.unitId);


      if (data.email) {
        await assertEmailFreeForTenant(this.prisma, data.email, {
          organizationId: tenant.organizationId,
        });
      }
    }

    if (table === "utility_bills" && data.assignAll && !data.unitId) {
      return this.createSharedUtilityBills(tenant, data);
    }
    if (table === "utility_bills") {
      delete data.splitAmount;
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
        await this.syncTenantOpeningBalanceArrear(tenant, row);
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
    await this.propertyAccess.assertWritableReferences(tenant, data);
    if (table === "units" && data.status !== undefined) {
      data.status = String(data.status || "vacant").toLowerCase();
    }

    if (table === "tenants") {
      if (data.openingBalance !== undefined) {
        data.openingBalance = this.toNumber(data.openingBalance);
      }
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
          await this.markUnitStatus(tenant, data.unitId || existingRow.unit_id, "vacant");
        } else {
          await this.markUnitStatus(tenant, data.unitId, "occupied");
        }
        await this.syncTenantOpeningBalanceArrear(tenant, row);
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
      where: this.propertyAccess.scopeWhere(table, tenant, {
        id,
        organizationId: tenant.organizationId,
      }),
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
      select: { id: true, status: true, propertyId: true },
    });

    if (!unit) throw new BadRequestException("Selected unit was not found");
    this.propertyAccess.assertPropertyIdAllowed(tenant, unit.propertyId);

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
    this.propertyAccess.assertPropertyIdAllowed(tenant, property.id);

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
      select: { id: true, name: true, unitCount: true, propertyId: true },
    });

    if (!block) {
      throw new BadRequestException("Selected block was not found");
    }
    this.propertyAccess.assertPropertyIdAllowed(tenant, block.propertyId);

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

  private async createSharedUtilityBills(
    tenant: TenantContext,
    data: Record<string, any>,
  ) {
    if (!data.propertyId) {
      throw new BadRequestException("Bill must be linked to a property");
    }
    this.propertyAccess.assertPropertyIdAllowed(tenant, data.propertyId);

    const activeTenants = await this.prisma.tenant.findMany({
      where: this.propertyAccess.scopeWhere("tenants", tenant, {
        organizationId: tenant.organizationId,
        status: { in: ["active", "Active"] },
        unit: {
          propertyId: data.propertyId,
          ...(data.blockId ? { blockId: data.blockId } : {}),
        },
      }),
      select: {
        unit: { select: { id: true, blockId: true } },
      },
    });

    const units = [
      ...new Map(
        activeTenants
          .map((row) => row.unit)
          .filter(Boolean)
          .map((unit) => [unit!.id, unit!]),
      ).values(),
    ];

    if (!units.length) {
      throw new BadRequestException(
        "No active tenant units found for this auto-assigned bill",
      );
    }

    const totalAmount = this.toNumber(data.totalAmount);
    if (totalAmount <= 0) {
      throw new BadRequestException("Bill amount must be greater than zero");
    }

    const shouldSplitAmount = data.splitAmount === true;
    delete data.splitAmount;
    const perUnitAmount = shouldSplitAmount ? totalAmount / units.length : totalAmount;
    const rows = await Promise.all(
      units.map((unit) =>
        this.prisma.utilityBill.create({
          data: {
            ...data,
            organizationId: tenant.organizationId,
            unitId: unit.id,
            blockId: unit.blockId || data.blockId || null,
            totalAmount: perUnitAmount,
            assignAll: true,
          } as any,
        }),
      ),
    );

    return this.toSnake(rows);
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
      where: this.propertyAccess.scopeWhere("units", tenant, {
        id: unitId,
        organizationId: tenant.organizationId,
      }),
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
    const where = this.buildWhere("utility_bills", tenant, query);
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

    const where = this.buildWhere("tenants", tenant, normalizedQuery);
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
        [this.toCamel(normalizedQuery.orderBy)]:
          normalizedQuery.order === "desc" ? "desc" : "asc",
      };
    }

    this.applyPagination(args, normalizedQuery);

    try {
      const rows = await this.prisma.tenant.findMany(args as any);
      const tenantIds = (rows as any[]).map((row) => row.id);
      const arrearStats = tenantIds.length
        ? await this.prisma.arrear.groupBy({
            by: ["tenantId"],
            where: {
              organizationId: tenant.organizationId,
              tenantId: { in: tenantIds },
              status: { in: ["pending", "partial"] },
            },
            _sum: {
              amountDue: true,
              amountPaid: true,
            },
            _min: {
              month: true,
              dueDate: true,
            },
          })
        : [];
      const arrearsByTenant = new Map(
        arrearStats.map((stat) => [stat.tenantId, stat]),
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return this.toSnake(
        (rows as any[]).map(({ unit, ...row }) => {
          const arrears = arrearsByTenant.get(row.id);
          const arrearsBalance = Math.max(
            0,
            this.toNumber(arrears?._sum.amountDue) -
              this.toNumber(arrears?._sum.amountPaid),
          );
          const oldestArrear = arrears?._min.dueDate || arrears?._min.month || null;
          const daysInArrears = oldestArrear
            ? Math.max(0, Math.floor((today.getTime() - oldestArrear.getTime()) / 86400000))
            : 0;

          return {
            ...row,
            tenantId: row.id,
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
    const where = this.buildWhere("arrears", tenant, query);
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
    const where = this.buildWhere("maintenance_requests", tenant, query);
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
    const where = this.buildWhere("owner_advances", tenant, query);
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
          status: row.status || "disbursed",
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
        where: this.propertyAccess.scopeWhere("payments", tenant, {
          organizationId: tenant.organizationId,
          ...(Object.keys(paymentDate).length ? { paymentDate } : {}),
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

  private async listDashboardOverview(tenant: TenantContext, query: Record<string, any>) {
    const propertyId = query.property_id || query.propertyId;
    const blockId = query.block_id || query.blockId;
    const startDate = this.parseQueryDate(query.start_date || query.startDate);
    const endDate = this.parseQueryDate(query.end_date || query.endDate, true);
    const propertyFilter = this.propertyFilterSql("p", tenant, propertyId);
    if (!propertyFilter) return [];

    const paymentDateFilter = Prisma.sql`${startDate ? Prisma.sql`AND pay.payment_date >= ${startDate}` : Prisma.empty}
      ${endDate ? Prisma.sql`AND pay.payment_date <= ${endDate}` : Prisma.empty}`;
    const arrearDueFilter = this.dueArrearSql("a", startDate, endDate);
    const blockFilter = blockId ? Prisma.sql`AND u.block_id = ${blockId}` : Prisma.empty;

    const rows = await this.prisma.$queryRaw<any[]>`
      WITH scoped_properties AS (
        SELECT p.id, p.name
        FROM properties p
        WHERE p."organizationId" = ${tenant.organizationId}
          ${propertyFilter}
      ),
      unit_stats AS (
        SELECT
          u.property_id,
          COUNT(DISTINCT u.id)::int AS total_units,
          COUNT(DISTINCT CASE
            WHEN LOWER(COALESCE(u.status, '')) = 'occupied'
              OR LOWER(COALESCE(t.status, '')) = 'active'
            THEN u.id
          END)::int AS occupied_units,
          COUNT(DISTINCT CASE
            WHEN LOWER(COALESCE(t.status, '')) = 'active'
            THEN t.id
          END)::int AS active_tenants
        FROM units u
        LEFT JOIN tenants t
          ON t.unit_id = u.id
         AND t."organizationId" = u."organizationId"
         AND LOWER(COALESCE(t.status, '')) = 'active'
        WHERE u."organizationId" = ${tenant.organizationId}
          ${blockFilter}
        GROUP BY u.property_id
      ),
      payment_stats AS (
        SELECT
          u.property_id,
          COALESCE(SUM(pay.amount), 0)::numeric AS total_collected
        FROM payments pay
        JOIN tenants t
          ON t.id = pay.tenant_id
         AND t."organizationId" = pay."organizationId"
        JOIN units u
          ON u.id = t.unit_id
         AND u."organizationId" = t."organizationId"
        JOIN scoped_properties sp ON sp.id = u.property_id
        WHERE pay."organizationId" = ${tenant.organizationId}
          ${paymentDateFilter}
          ${blockFilter}
        GROUP BY u.property_id
      ),
      arrear_stats AS (
        SELECT
          u.property_id,
          COALESCE(SUM(GREATEST(0, a.amount_due - a.amount_paid)), 0)::numeric AS total_outstanding
        FROM arrears a
        JOIN tenants t
          ON t.id = a.tenant_id
         AND t."organizationId" = a."organizationId"
        JOIN units u
          ON u.id = t.unit_id
         AND u."organizationId" = t."organizationId"
        JOIN scoped_properties sp ON sp.id = u.property_id
        WHERE a."organizationId" = ${tenant.organizationId}
          AND a.status IN ('pending', 'partial')
          ${arrearDueFilter}
          ${blockFilter}
        GROUP BY u.property_id
      )
      SELECT
        sp.id AS property_id,
        sp.name AS property_name,
        COALESCE(us.total_units, 0)::int AS total_units,
        COALESCE(us.active_tenants, 0)::int AS active_tenants,
        COALESCE(us.occupied_units, 0)::int AS occupied_units,
        CASE
          WHEN COALESCE(us.total_units, 0) > 0
          THEN (COALESCE(us.occupied_units, 0)::numeric / us.total_units::numeric) * 100
          ELSE 0
        END AS occupancy_rate,
        COALESCE(ps.total_collected, 0)::numeric AS total_collected,
        COALESCE(asx.total_outstanding, 0)::numeric AS total_outstanding,
        CASE
          WHEN COALESCE(ps.total_collected, 0) + COALESCE(asx.total_outstanding, 0) > 0
          THEN (COALESCE(ps.total_collected, 0) / (COALESCE(ps.total_collected, 0) + COALESCE(asx.total_outstanding, 0))) * 100
          ELSE 0
        END AS collection_rate
      FROM scoped_properties sp
      LEFT JOIN unit_stats us ON us.property_id = sp.id
      LEFT JOIN payment_stats ps ON ps.property_id = sp.id
      LEFT JOIN arrear_stats asx ON asx.property_id = sp.id
      ORDER BY sp.name ASC
    `;

    return rows.map((row) => ({
      property_id: row.property_id,
      property_name: row.property_name,
      total_units: Number(row.total_units || 0),
      active_tenants: Number(row.active_tenants || 0),
      occupied_units: Number(row.occupied_units || 0),
      occupancy_rate: this.toNumber(row.occupancy_rate),
      total_collected: this.toNumber(row.total_collected),
      total_outstanding: this.toNumber(row.total_outstanding),
      collection_rate: this.toNumber(row.collection_rate),
    }));
  }


  private async listDashboardBundle(
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
    const overview = await this.listDashboardOverview(tenant, query);
    const startDate = this.parseQueryDate(query.start_date || query.startDate);
    const endDate = this.parseQueryDate(query.end_date || query.endDate, true);
    const propertyId = query.property_id || query.propertyId;
    const propertyFilter = this.propertyFilterSql("p", tenant, propertyId);
    if (!propertyFilter) {
      return {
        overview,
        properties: [],
        available_years: [new Date().getFullYear()],
        monthly_aggregates: [],
      };
    }

    const [properties, paymentYears, arrearYears, monthlyRows] = await Promise.all([
      this.prisma.property.findMany({
        where: this.propertyAccess.scopeWhere("properties", tenant, {
          organizationId: tenant.organizationId,
          ...(propertyId ? { id: propertyId } : {}),
        }),
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT EXTRACT(YEAR FROM pay.payment_date)::int AS year
        FROM payments pay
        JOIN tenants t
          ON t.id = pay.tenant_id
         AND t."organizationId" = pay."organizationId"
        JOIN units u
          ON u.id = t.unit_id
         AND u."organizationId" = t."organizationId"
        JOIN properties p
          ON p.id = u.property_id
         AND p."organizationId" = u."organizationId"
        WHERE pay."organizationId" = ${tenant.organizationId}
          ${propertyFilter}
      `,
      this.prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT EXTRACT(YEAR FROM a.month)::int AS year
        FROM arrears a
        JOIN tenants t
          ON t.id = a.tenant_id
         AND t."organizationId" = a."organizationId"
        JOIN units u
          ON u.id = t.unit_id
         AND u."organizationId" = t."organizationId"
        JOIN properties p
          ON p.id = u.property_id
         AND p."organizationId" = u."organizationId"
        WHERE a."organizationId" = ${tenant.organizationId}
          AND a.status IN ('pending', 'partial')
          ${this.dueArrearSql("a")}
          ${propertyFilter}
      `,
      this.prisma.$queryRaw<any[]>`
        WITH scoped_properties AS (
          SELECT p.id
          FROM properties p
          WHERE p."organizationId" = ${tenant.organizationId}
            ${propertyFilter}
        ),
        payment_months AS (
          SELECT
            u.property_id,
            EXTRACT(YEAR FROM pay.payment_date)::int AS year,
            (EXTRACT(MONTH FROM pay.payment_date)::int - 1) AS month,
            COALESCE(SUM(pay.amount), 0)::numeric AS collected,
            0::numeric AS outstanding
          FROM payments pay
          JOIN tenants t
            ON t.id = pay.tenant_id
           AND t."organizationId" = pay."organizationId"
          JOIN units u
            ON u.id = t.unit_id
           AND u."organizationId" = t."organizationId"
          JOIN scoped_properties sp ON sp.id = u.property_id
          WHERE pay."organizationId" = ${tenant.organizationId}
            ${startDate ? Prisma.sql`AND pay.payment_date >= ${startDate}` : Prisma.empty}
            ${endDate ? Prisma.sql`AND pay.payment_date <= ${endDate}` : Prisma.empty}
          GROUP BY u.property_id, year, month
        ),
        arrear_months AS (
          SELECT
            u.property_id,
            EXTRACT(YEAR FROM a.month)::int AS year,
            (EXTRACT(MONTH FROM a.month)::int - 1) AS month,
            0::numeric AS collected,
            COALESCE(SUM(GREATEST(0, a.amount_due - a.amount_paid)), 0)::numeric AS outstanding
          FROM arrears a
          JOIN tenants t
            ON t.id = a.tenant_id
           AND t."organizationId" = a."organizationId"
          JOIN units u
            ON u.id = t.unit_id
           AND u."organizationId" = t."organizationId"
          JOIN scoped_properties sp ON sp.id = u.property_id
          WHERE a."organizationId" = ${tenant.organizationId}
            AND a.status IN ('pending', 'partial')
            ${this.dueArrearSql("a", startDate, endDate)}
          GROUP BY u.property_id, year, month
        )
        SELECT
          property_id,
          year,
          month,
          SUM(collected)::numeric AS collected,
          SUM(outstanding)::numeric AS outstanding
        FROM (
          SELECT * FROM payment_months
          UNION ALL
          SELECT * FROM arrear_months
        ) combined
        GROUP BY property_id, year, month
        ORDER BY year DESC, month DESC
      `,
    ]);

    const yearSet = new Set<number>([new Date().getFullYear()]);
    for (const row of [...paymentYears, ...arrearYears]) {
      if (row.year) yearSet.add(Number(row.year));
    }
    const monthlyAggregates = monthlyRows.map((row) => ({
      property_id: row.property_id,
      year: Number(row.year),
      month: Number(row.month),
      collected: this.toNumber(row.collected),
      outstanding: this.toNumber(row.outstanding),
    }));

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
      status: { not: "cancelled" },
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
        where: this.propertyAccess.scopeWhere("payments", tenant, paymentWhere),
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

  private dueArrearSql(
    alias: string,
    startDate: Date | null = null,
    endDate: Date | null = null,
  ) {
    const today = new Date();
    const cutoff = endDate && endDate < today ? endDate : today;
    const dueDate = Prisma.raw(`"${alias}"."due_date"`);
    const month = Prisma.raw(`"${alias}"."month"`);

    return Prisma.sql`
      AND (
        (${dueDate} IS NOT NULL
          ${startDate ? Prisma.sql`AND ${dueDate} >= ${startDate}` : Prisma.empty}
          AND ${dueDate} <= ${cutoff}
        )
        OR
        (${dueDate} IS NULL
          ${startDate ? Prisma.sql`AND ${month} >= ${startDate}` : Prisma.empty}
          AND ${month} <= ${cutoff}
        )
      )
    `;
  }

  private propertyFilterSql(
    alias: string,
    tenant: TenantContext,
    propertyId?: string | null,
  ) {
    const idColumn = Prisma.raw(`"${alias}"."id"`);
    const selectedPropertyIds =
      tenant.propertyAccessScope === "SELECTED" ? tenant.propertyIds || [] : null;

    if (propertyId && selectedPropertyIds && !selectedPropertyIds.includes(propertyId)) {
      return null;
    }

    if (propertyId) {
      return Prisma.sql`AND ${idColumn} = ${propertyId}`;
    }

    if (selectedPropertyIds) {
      if (!selectedPropertyIds.length) return null;
      return Prisma.sql`AND ${idColumn} IN (${Prisma.join(selectedPropertyIds)})`;
    }

    return Prisma.empty;
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

  private async syncTenantOpeningBalanceArrear(
    tenant: TenantContext,
    tenantRow: any,
  ) {
    const tenantId = tenantRow?.id;
    if (!tenantId) return;

    const openingBalance = this.toNumber(tenantRow.openingBalance);
    const leaseStart = tenantRow.leaseStart
      ? new Date(tenantRow.leaseStart)
      : new Date();
    const openingMonth = this.addMonths(this.monthStart(leaseStart), -1);

    const fullTenant = await this.prisma.tenant.findFirst({
      where: this.propertyAccess.scopeWhere("tenants", tenant, {
        id: tenantId,
        organizationId: tenant.organizationId,
      }),
      include: {
        unit: {
          include: {
            property: { select: { rentDueDay: true } },
          },
        },
      },
    });

    const existing = await this.prisma.arrear.findFirst({
      where: {
        organizationId: tenant.organizationId,
        tenantId,
        month: openingMonth,
      },
    });

    if (openingBalance <= 0) {
      if (existing && this.toNumber(existing.amountPaid) <= 0) {
        await this.prisma.arrear.delete({ where: { id: existing.id } });
      }
      return;
    }

    const amountPaid = this.toNumber(existing?.amountPaid);
    const status =
      amountPaid >= openingBalance
        ? "cleared"
        : amountPaid > 0
          ? "partial"
          : "pending";
    const data = {
      amountDue: openingBalance,
      status,
      dueDate: this.dueDateForMonth(
        openingMonth,
        fullTenant?.unit?.property?.rentDueDay ?? fullTenant?.rentDueDate,
      ),
    };

    if (existing) {
      await this.prisma.arrear.update({
        where: { id: existing.id },
        data,
      });
      return;
    }

    await this.prisma.arrear.create({
      data: {
        organizationId: tenant.organizationId,
        tenantId,
        month: openingMonth,
        amountPaid: 0,
        ...data,
      },
    });
  }

  private async syncPropertyArrearDueDates(
    tenant: TenantContext,
    propertyId: string,
    dueDay: number,
  ) {
    const arrears = await this.prisma.arrear.findMany({
      where: this.propertyAccess.scopeWhere("arrears", tenant, {
        organizationId: tenant.organizationId,
        status: { in: ["pending", "partial", "prepaid"] },
        tenant: {
          unit: {
            propertyId,
          },
        },
      }),
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

  private buildWhere(
    table: string,
    tenant: TenantContext,
    query: Record<string, any>,
  ) {
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
    return this.propertyAccess.scopeWhere(table, tenant, where);
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
