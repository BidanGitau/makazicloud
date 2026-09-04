import { BadRequestException, Injectable } from "@nestjs/common";

import { billingCycleMonths, isBillingMonth } from "../billing/billing-cycle";
import { MemoryCacheService } from "../cache/memory-cache.service";
import { PrismaService } from "../prisma/prisma.service";
import { SmsService } from "../sms/sms.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { PropertyAccessService } from "../tenancy/property-access.service";

const DEFAULT_AGENCY_PHONE = process.env.DEFAULT_AGENCY_PHONE || "0700000000";

export type RentAdjustmentMode = "set" | "increase_amount" | "increase_percent";

export type RentAdjustmentInput = {
  unitIds?: string[];
  propertyId?: string;
  scope?: "unit" | "property" | "all";
  mode: RentAdjustmentMode;
  value: number;
  effectiveMonth: string;
};

type RentAdjustmentNotice = {
  phone: string;
  tenantName: string;
  unitNumber: string;
  propertyName: string;
  previousRent: number;
  nextRent: number;
};

@Injectable()
export class RentAdjustmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyAccess: PropertyAccessService,
    private readonly cache: MemoryCacheService,
    private readonly sms: SmsService,
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
    const notices: RentAdjustmentNotice[] = [];

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

      notices.push({
        phone: String(activeTenant.emergencyContact || "").trim(),
        tenantName: activeTenant.fullName,
        unitNumber: unit.unitNumber,
        propertyName: unit.property?.name || "the property",
        previousRent: currentRent,
        nextRent,
      });

      updatedArrears += await this.syncTenantArrearsFromMonth(
        tenant.organizationId,
        activeTenant,
        effectiveMonth,
        nextRent,
        unit.property?.rentDueDay ?? activeTenant.rentDueDate,
      );
    }

    this.cache.invalidatePrefix(`private:${tenant.organizationId}:`);

    const sms = await this.notifyTenants(tenant, notices, input.effectiveMonth);
    const smsNote =
      sms.sent > 0
        ? ` SMS sent to ${sms.sent} tenant(s).`
        : sms.skipped > 0
          ? " No tenant SMS sent (missing phone numbers or SMS failed)."
          : "";

    return {
      success: true,
      message: `Rent updated on ${updatedUnits} unit(s). ${updatedArrears} arrear row(s) adjusted from ${input.effectiveMonth}.${smsNote}`,
      updatedUnits,
      updatedArrears,
      unitsProcessed: units.length,
      sms,
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
          property: { select: { rentDueDay: true, name: true } },
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
        property: { select: { rentDueDay: true, name: true } },
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

  private async notifyTenants(
    tenant: TenantContext,
    notices: RentAdjustmentNotice[],
    effectiveMonth: string,
  ) {
    const withPhone = notices.filter((notice) => notice.phone);
    const skipped = notices.length - withPhone.length;
    if (!withPhone.length) {
      return { sent: 0, skipped, reason: notices.length ? "missing phone" : "no occupied units" };
    }

    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: tenant.organizationId },
        select: {
          name: true,
          institutionName: true,
          agencyPhone: true,
        },
      });
      const agencyName =
        organization?.institutionName?.trim() ||
        organization?.name?.trim() ||
        "MakaziCloud Property Management";
      const agencyPhone =
        organization?.agencyPhone?.trim() || DEFAULT_AGENCY_PHONE;
      const monthLabel = this.formatMonthLabel(effectiveMonth);

      await this.sms.sendBulk(tenant, {
        messages: withPhone.map((notice) => {
          const firstName = String(notice.tenantName || "Tenant")
            .trim()
            .split(/\s+/)[0];
          return {
            phoneNumber: notice.phone,
            message: [
              `Habari ${firstName},`,
              `rent for unit ${notice.unitNumber} at ${notice.propertyName} will change from ${this.formatKes(notice.previousRent)} to ${this.formatKes(notice.nextRent)} starting ${monthLabel}.`,
              `For help call ${agencyName}: ${agencyPhone}.`,
            ].join(" "),
          };
        }),
      });
      return { sent: withPhone.length, skipped };
    } catch (error) {
      return {
        sent: 0,
        skipped: notices.length,
        reason: error instanceof Error ? error.message : "SMS failed",
      };
    }
  }

  private formatMonthLabel(value: string) {
    const match = String(value || "").trim().match(/^(\d{4})-(\d{2})$/);
    if (!match) return value;
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)).toLocaleDateString(
      "en-KE",
      { month: "long", year: "numeric", timeZone: "UTC" },
    );
  }

  private formatKes(value: unknown) {
    const amount = this.toNumber(value);
    return `KSh ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
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
