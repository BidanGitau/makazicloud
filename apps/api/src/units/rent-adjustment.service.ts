import { BadRequestException, Injectable } from "@nestjs/common";

import { billingCycleMonths, isBillingMonth } from "../billing/billing-cycle";
import { MemoryCacheService } from "../cache/memory-cache.service";
import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { PropertyAccessService } from "../tenancy/property-access.service";

export type RentAdjustmentMode = "set" | "increase_amount" | "increase_percent";

export type RentAdjustmentInput = {
  unitIds?: string[];
  propertyId?: string;
  scope?: "unit" | "property" | "all";
  mode: RentAdjustmentMode;
  value: number;
  effectiveMonth: string;
};

@Injectable()
export class RentAdjustmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyAccess: PropertyAccessService,
    private readonly cache: MemoryCacheService,
  ) {}

  async apply(tenant: TenantContext, input: RentAdjustmentInput) {
    const effectiveMonth = this.parseEffectiveMonth(input.effectiveMonth);
    const mode = input.mode;
    const value = Number(input.value);

    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException("Rent adjustment value must be zero or greater");
    }
    if (mode === "increase_percent" && value > 1000) {
      throw new BadRequestException("Percentage increase is too large");
    }

    const units = await this.resolveUnits(tenant, input);
    if (!units.length) {
      throw new BadRequestException("No units matched this rent adjustment");
    }

    let updatedUnits = 0;
    let updatedArrears = 0;

    for (const unit of units) {
      const currentRent = this.toNumber(unit.rentAmount);
      const nextRent = this.resolveNextRent(currentRent, mode, value);
      if (nextRent === currentRent) continue;

      await this.prisma.unit.updateMany({
        where: this.propertyAccess.scopeWhere("units", tenant, {
          id: unit.id,
          organizationId: tenant.organizationId,
        }),
        data: { rentAmount: nextRent },
      });
      updatedUnits += 1;

      const activeTenant = await this.prisma.tenant.findFirst({
        where: this.propertyAccess.scopeWhere("tenants", tenant, {
          organizationId: tenant.organizationId,
          unitId: unit.id,
          status: { in: ["active", "Active"] },
        }),
      });

      if (!activeTenant) continue;

      updatedArrears += await this.syncTenantArrearsFromMonth(
        tenant.organizationId,
        activeTenant,
        effectiveMonth,
        nextRent,
        unit.property?.rentDueDay ?? activeTenant.rentDueDate,
      );
    }

    this.cache.invalidatePrefix(`private:${tenant.organizationId}:`);

    return {
      success: true,
      message: `Rent updated on ${updatedUnits} unit(s). ${updatedArrears} arrear row(s) adjusted from ${input.effectiveMonth}.`,
      updatedUnits,
      updatedArrears,
      unitsProcessed: units.length,
    };
  }

  private async resolveUnits(tenant: TenantContext, input: RentAdjustmentInput) {
    const scope = input.scope || (input.unitIds?.length ? "unit" : input.propertyId ? "property" : "all");

    if (scope === "unit") {
      const unitIds = input.unitIds?.filter(Boolean) || [];
      if (!unitIds.length) {
        throw new BadRequestException("Choose at least one unit");
      }
      return this.prisma.unit.findMany({
        where: this.propertyAccess.scopeWhere("units", tenant, {
          organizationId: tenant.organizationId,
          id: { in: unitIds },
        }),
        include: {
          property: { select: { rentDueDay: true } },
        },
      });
    }

    const propertyIds = this.propertyAccess.scopedPropertyIds(tenant, input.propertyId || null);
    if (propertyIds && propertyIds.length === 0) {
      return [];
    }

    return this.prisma.unit.findMany({
      where: this.propertyAccess.scopeWhere("units", tenant, {
        organizationId: tenant.organizationId,
        ...(propertyIds ? { propertyId: { in: propertyIds } } : {}),
      }),
      include: {
        property: { select: { rentDueDay: true } },
      },
    });
  }

  private resolveNextRent(currentRent: number, mode: RentAdjustmentMode, value: number) {
    if (mode === "set") return Math.round(value);
    if (mode === "increase_amount") return Math.max(0, Math.round(currentRent + value));
    return Math.max(0, Math.round(currentRent * (1 + value / 100)));
  }

  private async syncTenantArrearsFromMonth(
    organizationId: string,
    tenantRow: { id: string; leaseStart?: Date | null; billingCycleEnabled?: boolean; billingCycleMonths?: number | null; rentDueDate?: number | null },
    effectiveMonth: Date,
    rentAmount: number,
    rentDueDay?: number | null,
  ) {
    const cycleMonths = billingCycleMonths(tenantRow);
    const amountDue = rentAmount * cycleMonths;
    const startMonth = this.monthStart(new Date(tenantRow.leaseStart || effectiveMonth));

    const arrears = await this.prisma.arrear.findMany({
      where: {
        organizationId,
        tenantId: tenantRow.id,
        month: { gte: effectiveMonth },
        status: { in: ["pending", "partial", "prepaid"] },
      },
    });

    let updated = 0;
    for (const row of arrears) {
      if (!isBillingMonth(startMonth, row.month, cycleMonths)) continue;

      const paid = this.toNumber(row.amountPaid);
      const status = String(row.status || "").toLowerCase();
      let nextStatus: string;

      if (status === "prepaid") {
        nextStatus = paid >= amountDue ? "cleared" : paid > 0 ? "partial" : "pending";
      } else {
        nextStatus = paid >= amountDue ? "cleared" : paid > 0 ? "partial" : "pending";
      }

      await this.prisma.arrear.update({
        where: { id: row.id },
        data: {
          amountDue,
          status: nextStatus,
          dueDate: row.dueDate || this.dueDateForMonth(row.month, rentDueDay),
        },
      });
      updated += 1;
    }

    return updated;
  }

  private parseEffectiveMonth(value: string) {
    const match = String(value || "").trim().match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      throw new BadRequestException("Effective month must use YYYY-MM format");
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) {
      throw new BadRequestException("Effective month is invalid");
    }
    const parsed = new Date(Date.UTC(year, month - 1, 1));
    const currentMonth = this.monthStart(new Date());
    if (parsed <= currentMonth) {
      throw new BadRequestException(
        "Effective month must be a future month — the current month is already in progress",
      );
    }
    return parsed;
  }

  private monthStart(value: Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
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

  private toNumber(value: unknown) {
    if (value === null || value === undefined || value === "") return 0;
    return Number(value) || 0;
  }
}
