import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { RentLedgerService } from "../rent-ledger/rent-ledger.service";
import { PropertyAccessService } from "../tenancy/property-access.service";
import {
  billedAmountDue,
  billingCycleMonths,
  isBillingMonth,
  moveInDueDate,
} from "../billing/billing-cycle";
import { leaseEndMonthStart } from "../billing/lease-month";

@Injectable()
export class ArrearsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentLedger: RentLedgerService,
    private readonly propertyAccess: PropertyAccessService,
  ) {}

  async populateCurrentMonth(tenant: TenantContext) {
    const today = new Date();
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

    const tenants = await this.prisma.tenant.findMany({
      where: this.propertyAccess.scopeWhere("tenants", tenant, {
        organizationId: tenant.organizationId,
        status: { in: ["active", "Active"] },
      }),
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

    // One query for every existing month instead of one lookup per tenant-month.
    const existingRows = await this.prisma.arrear.findMany({
      where: {
        organizationId: tenant.organizationId,
        tenantId: { in: tenants.map((row) => row.id) },
        month: { lte: monthStart },
      },
    });
    const existingByTenantMonth = new Map(
      existingRows.map((row) => [this.tenantMonthKey(row.tenantId, row.month), row]),
    );

    let created = 0;
    let updated = 0;

    for (const row of tenants) {
      if (!row.unit) continue;
      if (row.leaseStart && new Date(row.leaseStart) > today) {
        continue;
      }
      const cycleMonths = billingCycleMonths(row);
      const startMonth = this.monthStart(new Date(row.leaseStart || today));
      const leaseEndCap = row.leaseEnd ? leaseEndMonthStart(row.leaseEnd) : null;

      for (
        let month = startMonth;
        month <= monthStart;
        month = this.addMonths(month, 1)
      ) {
        if (leaseEndCap && month > leaseEndCap) {
          continue;
        }
        const existing = existingByTenantMonth.get(this.tenantMonthKey(row.id, month));

        if (!isBillingMonth(startMonth, month, cycleMonths)) {
          if (existing) {
            const paid = Number(existing.amountPaid || 0);
            const alreadyCredit =
              Number(existing.amountDue || 0) === 0 &&
              String(existing.status || "").toLowerCase() === "prepaid";
            if (paid > 0 && alreadyCredit) continue;
            if (paid > 0) {
              await this.prisma.arrear.update({
                where: { id: existing.id },
                data: { amountDue: 0, status: "prepaid" },
              });
              updated += 1;
            } else {
              await this.prisma.arrear.delete({ where: { id: existing.id } });
            }
          }
          continue;
        }

        const amountDue = billedAmountDue(row, month, startMonth);
        if (amountDue <= 0) continue;

        if (!existing) {
          await this.prisma.arrear.create({
            data: {
              organizationId: tenant.organizationId,
              tenantId: row.id,
              month,
              amountDue,
              amountPaid: 0,
              status: "pending",
              dueDate:
                moveInDueDate(row, month) ??
                this.dueDateForMonth(
                  month,
                  row.unit.property?.rentDueDay ?? row.rentDueDate,
                ),
            },
          });
          created += 1;
          continue;
        }

        if (String(existing.status || "").toLowerCase() === "prepaid") {
          const paid = Number(existing.amountPaid || 0);
          await this.prisma.arrear.update({
            where: { id: existing.id },
            data: {
              amountDue,
              status: paid >= amountDue ? "cleared" : paid > 0 ? "partial" : "pending",
            },
          });
          updated += 1;
        }
      }
    }

    const reconciledPayments = await this.rentLedger.reconcileUnallocatedPayments(tenant);

    return {
      success: true,
      message: `Arrears population complete. ${created} new arrears created, ${updated} prepaid rows updated, ${reconciledPayments} payments reconciled.`,
      created,
      updated,
      reconciledPayments,
    };
  }

  private tenantMonthKey(tenantId: string, month: Date) {
    return `${tenantId}|${this.monthStart(new Date(month)).toISOString().slice(0, 7)}`;
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
}
