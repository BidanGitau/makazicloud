import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { arrearBalance, isOpenArrearStatus } from "../billing/arrear-balance";
import { isArrearWaivedOnLeaseCancel } from "../billing/lease-month";
import { MemoryCacheService } from "../cache/memory-cache.service";
import { PrismaService } from "../prisma/prisma.service";
import { SmsService } from "../sms/sms.service";
import { PropertyAccessService } from "../tenancy/property-access.service";
import type { TenantContext } from "../tenancy/tenant-context";

export type ManualDeduction = { label: string; amount: number };

export type CancelLeaseInput = {
  tenant_id: string;
  unit_id?: string | null;
  lease_end_date: string;
  total_deposit?: number;
  fault_deductions?: number;
  manual_deductions?: number;
  deduction_items?: ManualDeduction[];
  notes?: string;
  tenant_name?: string;
  property_name?: string;
  unit_number?: string;
};

const DEDUCTIONS_NOTE_PREFIX = "Manual deductions:";
const DEFAULT_AGENCY_PHONE = process.env.DEFAULT_AGENCY_PHONE || "0700000000";

@Injectable()
export class LeaseCancelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyAccess: PropertyAccessService,
    private readonly cache: MemoryCacheService,
    private readonly sms: SmsService,
  ) {}

  async cancel(tenant: TenantContext, input: CancelLeaseInput) {
    const tenantId = String(input?.tenant_id || "").trim();
    if (!tenantId) {
      throw new BadRequestException("tenant_id is required");
    }

    const leaseEndDate = this.parseLeaseEndDate(input.lease_end_date);
    const manualDeductions = this.normalizeManualDeductions(input.deduction_items);
    const manualDeductionTotal = manualDeductions.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const faultDeductions =
      input.manual_deductions !== undefined
        ? this.toNumber(input.fault_deductions)
        : this.toNumber(input.fault_deductions) + manualDeductionTotal;

    const result = await this.prisma.$transaction(async (tx) => {
      const tenantRow = await tx.tenant.findFirst({
        where: this.propertyAccess.scopeWhere("tenants", tenant, {
          id: tenantId,
          organizationId: tenant.organizationId,
        }),
        include: {
          unit: {
            select: {
              id: true,
              depositAmount: true,
              propertyId: true,
            },
          },
        },
      });

      if (!tenantRow) {
        throw new NotFoundException("Tenant not found");
      }

      const unitId = input.unit_id || tenantRow.unitId || tenantRow.unit?.id || null;
      const deposit =
        input.total_deposit !== undefined
          ? this.toNumber(input.total_deposit)
          : this.toNumber(tenantRow.unit?.depositAmount);

      const arrears = await tx.arrear.findMany({
        where: {
          organizationId: tenant.organizationId,
          tenantId,
        },
        orderBy: { month: "asc" },
      });

      const openArrears = arrears.filter((row) =>
        isOpenArrearStatus(row.status),
      );
      const toWaive = openArrears.filter((row) =>
        isArrearWaivedOnLeaseCancel(
          { month: row.month, dueDate: row.dueDate },
          leaseEndDate,
        ),
      );
      const collectible = openArrears.filter(
        (row) =>
          !isArrearWaivedOnLeaseCancel(
            { month: row.month, dueDate: row.dueDate },
            leaseEndDate,
          ),
      );

      let waivedCount = 0;
      let waivedTotal = 0;

      for (const row of toWaive) {
        const paid = this.toNumber(row.amountPaid);
        const balance = arrearBalance(row.amountDue, row.amountPaid);
        waivedTotal += balance;
        waivedCount += 1;

        if (paid > 0) {
          await tx.arrear.update({
            where: { id: row.id },
            data: { status: "cleared", amountDue: paid },
          });
        } else {
          await tx.arrear.update({
            where: { id: row.id },
            data: { status: "waived", amountDue: 0, amountPaid: 0 },
          });
        }
      }

      const collectibleRows = collectible.map((row) => ({
        id: row.id,
        amountDue: this.toNumber(row.amountDue),
        amountPaid: this.toNumber(row.amountPaid),
        balance: arrearBalance(row.amountDue, row.amountPaid),
      }));
      const arrearsTotal = collectibleRows.reduce(
        (sum, row) => sum + row.balance,
        0,
      );

      const depositAppliedToRepairs = Math.min(deposit, faultDeductions);
      const depositAvailableForArrears = Math.max(
        0,
        deposit - depositAppliedToRepairs,
      );
      const arrearsApplied = Math.min(
        arrearsTotal,
        depositAvailableForArrears,
      );
      const remainingArrears = Math.max(0, arrearsTotal - arrearsApplied);
      const deductions = faultDeductions + arrearsTotal;
      const netRefund = Math.max(0, deposit - deductions);

      let remainingDepositCredit = arrearsApplied;
      for (const row of collectibleRows) {
        if (remainingDepositCredit <= 0) break;

        const applied = Math.min(remainingDepositCredit, row.balance);
        remainingDepositCredit -= applied;
        const nextPaid = row.amountPaid + applied;
        const nextStatus =
          nextPaid >= row.amountDue ? "cleared" : "partial";

        await tx.arrear.update({
          where: { id: row.id },
          data: { amountPaid: nextPaid, status: nextStatus },
        });
      }

      const manualNotes = this.formatManualDeductionNotes(manualDeductions);
      const leaseEndLabel = input.lease_end_date;
      const defaultNotes = `Lease ended ${leaseEndLabel}. Arrears ${arrearsTotal.toLocaleString()} + deductions ${faultDeductions.toLocaleString()} deducted from KSh ${deposit.toLocaleString()} deposit.${
        waivedCount
          ? ` Waived ${waivedCount} month(s) after lease end.`
          : ""
      }`;
      const notes = [manualNotes, input.notes || defaultNotes]
        .filter(Boolean)
        .join("\n");

      await tx.refund.upsert({
        where: {
          organizationId_tenantId: {
            organizationId: tenant.organizationId,
            tenantId,
          },
        },
        create: {
          organizationId: tenant.organizationId,
          tenantId,
          unitId,
          leaseEndDate,
          amountRefunded: netRefund,
          status: "processed",
          notes,
        },
        update: {
          unitId,
          leaseEndDate,
          amountRefunded: netRefund,
          status: "processed",
          notes,
        },
      });

      await tx.tenant.update({
        where: { id: tenantRow.id },
        data: {
          status: "inactive",
          userId: null,
          leaseEnd: leaseEndDate,
        },
      });

      if (unitId) {
        await tx.unit.updateMany({
          where: this.propertyAccess.scopeWhere("units", tenant, {
            id: unitId,
            organizationId: tenant.organizationId,
          }),
          data: { status: "vacant" },
        });
      }

      return {
        tenant_id: tenantId,
        tenant_name: input.tenant_name || tenantRow.fullName,
        tenant_phone: tenantRow.emergencyContact || null,
        property_name: input.property_name || null,
        unit_number: input.unit_number || null,
        lease_end_date: leaseEndLabel,
        total_deposit: deposit,
        fault_deductions: faultDeductions,
        deduction_items: manualDeductions,
        arrears_deductions: arrearsTotal,
        arrears_applied: arrearsApplied,
        remaining_arrears: remainingArrears,
        arrears_items: collectibleRows,
        waived_arrears_count: waivedCount,
        waived_arrears_total: waivedTotal,
        deductions,
        net_refund: netRefund,
        processed_at: new Date().toISOString(),
      };
    });

    this.cache.invalidatePrefix(`private:${tenant.organizationId}:`);

    const sms = await this.sendRefundBrief(tenant, result);
    return { success: true, ...result, sms };
  }

  private async sendRefundBrief(
    tenant: TenantContext,
    result: {
      tenant_name?: string | null;
      tenant_phone?: string | null;
      lease_end_date?: string;
      net_refund?: number;
      property_name?: string | null;
    },
  ) {
    const phone = String(result.tenant_phone || "").trim();
    if (!phone) {
      return { sent: false, reason: "Tenant has no phone number" };
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
      const refundAmount = this.formatKes(result.net_refund);
      const leaseEnd = result.lease_end_date || "today";
      const firstName = String(result.tenant_name || "Tenant")
        .trim()
        .split(/\s+/)[0];

      const message = [
        `Habari ${firstName},`,
        `Your lease ended on ${leaseEnd}.`,
        `Refund due: ${refundAmount}.`,
        `It will be processed within 30 days from the lease cancellation date.`,
        `Thank you for staying with us.`,
        `For help call ${agencyName}: ${agencyPhone}.`,
      ].join(" ");

      await this.sms.sendBulk(tenant, {
        messages: [{ phoneNumber: phone, message }],
      });
      return { sent: true };
    } catch (error) {
      return {
        sent: false,
        reason: error instanceof Error ? error.message : "SMS failed",
      };
    }
  }

  private formatKes(value: unknown) {
    const amount = this.toNumber(value);
    return `KSh ${amount.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
  }

  private parseLeaseEndDate(value: string) {
    const match = String(value || "")
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) {
      throw new BadRequestException("lease_end_date must use YYYY-MM-DD format");
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new BadRequestException("lease_end_date is invalid");
    }
    return parsed;
  }

  private normalizeManualDeductions(items: ManualDeduction[] | undefined) {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => ({
        label: String(item?.label || "").trim(),
        amount: this.toNumber(item?.amount),
      }))
      .filter((item) => item.label && item.amount > 0);
  }

  private formatManualDeductionNotes(items: ManualDeduction[]) {
    if (!items.length) return "";
    return `${DEDUCTIONS_NOTE_PREFIX} ${JSON.stringify(items)}`;
  }

  private toNumber(value: unknown) {
    if (value === null || value === undefined || value === "") return 0;
    return Number(value) || 0;
  }
}
