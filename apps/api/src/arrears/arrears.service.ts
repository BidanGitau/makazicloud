import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { RentLedgerService } from "../rent-ledger/rent-ledger.service";
import { billingCycleMonths, isBillingMonth } from "../billing/billing-cycle";

@Injectable()
export class ArrearsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentLedger: RentLedgerService,
  ) {}

  async populateCurrentMonth(tenant: TenantContext) {
    const today = new Date();
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

    const tenants = await this.prisma.tenant.findMany({
      where: {
        organizationId: tenant.organizationId,
        status: { in: ["active", "Active"] },
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

    let created = 0;
    let updated = 0;

    for (const row of tenants) {
      if (!row.unit) continue;
      const rentAmount = Number(row.unit.rentAmount || 0);
      if (rentAmount <= 0) continue;
      const cycleMonths = billingCycleMonths(row);
      const amountDue = rentAmount * cycleMonths;

      if (row.leaseStart) {
        const leaseDate = new Date(row.leaseStart);
        if (leaseDate > today) {
          continue;
        }
      }

      const startMonth = this.monthStart(new Date(row.leaseStart || today));

      for (
        let month = startMonth;
        month <= monthStart;
        month = this.addMonths(month, 1)
      ) {
        const existing = await this.prisma.arrear.findFirst({
          where: {
            organizationId: tenant.organizationId,
            tenantId: row.id,
            month,
          },
        });

        if (!isBillingMonth(startMonth, month, cycleMonths)) {
          if (existing) {
            const paid = Number(existing.amountPaid || 0);
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

        if (!existing) {
          await this.prisma.arrear.create({
            data: {
              organizationId: tenant.organizationId,
              tenantId: row.id,
              month,
              amountDue,
              amountPaid: 0,
              status: "pending",
              dueDate: this.dueDateForMonth(
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
