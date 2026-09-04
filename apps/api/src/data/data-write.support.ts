import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

import { getSubscriptionPlan } from "../billing/subscription-plans";
import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { PropertyAccessService } from "../tenancy/property-access.service";
import { closeMonthStart, dueDateForMonth, lastCloseableMonthStart, addMonths, monthStart } from "./data.dates";
import { toNumber, toSnake } from "./data.mappers";

@Injectable()
export class DataWriteSupport {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyAccess: PropertyAccessService,
  ) {}

  async ensureTenantUnitIsAvailable(
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

  async ensureUnitCapacityAllowsCreate(tenant: TenantContext, data: Record<string, any>) {
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

  async createSharedUtilityBills(tenant: TenantContext, data: Record<string, any>) {
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

    const totalAmount = toNumber(data.totalAmount);
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

    return toSnake(rows);
  }

  async ensurePropertyLimitAllowsCreate(tenant: TenantContext) {
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

  async markUnitStatus(
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

  async syncTenantOpeningBalanceArrear(tenant: TenantContext, tenantRow: any) {
    const tenantId = tenantRow?.id;
    if (!tenantId) return;

    const openingBalance = toNumber(tenantRow.openingBalance);
    const leaseStart = tenantRow.leaseStart
      ? new Date(tenantRow.leaseStart)
      : new Date();
    const openingMonth = addMonths(monthStart(leaseStart), -1);

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
      if (existing && toNumber(existing.amountPaid) <= 0) {
        await this.prisma.arrear.delete({ where: { id: existing.id } });
      }
      return;
    }

    const amountPaid = toNumber(existing?.amountPaid);
    const status =
      amountPaid >= openingBalance
        ? "cleared"
        : amountPaid > 0
          ? "partial"
          : "pending";
    const data = {
      amountDue: openingBalance,
      status,
      dueDate: dueDateForMonth(
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

  async syncPropertyArrearDueDates(
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
            dueDate: dueDateForMonth(new Date(arrear.month), dueDay),
          },
        }),
      ),
    );
  }

  async assertOwnerSettlementCanBeCreated(
    tenant: TenantContext,
    data: Record<string, any>,
  ) {
    if (toNumber(data.grossCollection) <= 0) {
      throw new BadRequestException(
        "Nothing has been collected for this month yet.",
      );
    }

    const closeMonth = closeMonthStart(data.closeMonth);
    if (!closeMonth) {
      throw new BadRequestException("Close month is required.");
    }
    if (closeMonth.getTime() > lastCloseableMonthStart().getTime()) {
      throw new BadRequestException(
        "You can only disburse after the month has ended.",
      );
    }

    const existing = await this.prisma.ownerSettlement.findFirst({
      where: {
        organizationId: tenant.organizationId,
        propertyId: data.propertyId,
        closeMonth,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        "This month has already been disbursed and cannot be amended.",
      );
    }
  }
}
