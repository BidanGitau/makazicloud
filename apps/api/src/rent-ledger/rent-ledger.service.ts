import { Injectable } from "@nestjs/common";

import {
  billingCycleMonths,
  isBillingMonth,
  nextBillingMonthAfter,
} from "../billing/billing-cycle";
import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";

@Injectable()
export class RentLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async applyPayment(tenant: TenantContext, payment: any) {
    let remaining = this.toNumber(payment.amount);
    if (remaining <= 0 || !payment.tenantId) return;

    const existingAllocations = await this.prisma.paymentAllocation.count({
      where: {
        organizationId: tenant.organizationId,
        paymentId: payment.id,
      },
    });
    if (existingAllocations > 0) return;

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
    const isActiveTenant = String(tenantRow.status || "").toLowerCase() === "active";
    const cycleMonths = billingCycleMonths(tenantRow);
    const cycleAmount = rentAmount * cycleMonths;
    const addMonths = this.addMonths.bind(this);

    const paymentMonth = this.monthStart(new Date(payment.paymentDate || new Date()));
    if (isActiveTenant) {
      await this.ensureTenantArrearMonths(tenant.organizationId, tenantRow, paymentMonth);
    }

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

    if (!isActiveTenant) return;

    const leaseStartMonth = this.monthStart(new Date(tenantRow.leaseStart || paymentMonth));
    let creditMonth = nextBillingMonthAfter(
      leaseStartMonth,
      paymentMonth,
      cycleMonths,
      addMonths,
    );
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
      const creditCapacity = Math.max(0, cycleAmount - existingCredit);
      if (existing && creditCapacity <= 0) {
        creditMonth = nextBillingMonthAfter(
          leaseStartMonth,
          creditMonth,
          cycleMonths,
          addMonths,
        );
        continue;
      }

      const applied = Math.min(remaining, creditCapacity || cycleAmount);
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
      creditMonth = nextBillingMonthAfter(
        leaseStartMonth,
        creditMonth,
        cycleMonths,
        addMonths,
      );
    }
  }

  async reconcileUnallocatedPayments(tenant: TenantContext) {
    const payments = await this.prisma.payment.findMany({
      where: {
        organizationId: tenant.organizationId,
        allocations: { none: {} },
      },
      orderBy: { paymentDate: "asc" },
    });

    for (const payment of payments as any[]) {
      await this.applyPayment(tenant, payment);
    }

    return payments.length;
  }

  async ensureTenantArrearMonths(
    organizationId: string,
    tenantRow: any,
    throughMonth: Date,
  ) {
    if (!tenantRow?.unit) return;

    const rentAmount = this.toNumber(tenantRow.unit.rentAmount);
    if (rentAmount <= 0) return;
    const cycleMonths = billingCycleMonths(tenantRow);
    const amountDue = rentAmount * cycleMonths;

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

      if (!isBillingMonth(startMonth, month, cycleMonths)) {
        if (existing) {
          const paid = this.toNumber(existing.amountPaid);
          if (paid > 0) {
            await this.prisma.arrear.update({
              where: { id: existing.id },
              data: { amountDue: 0, status: "prepaid" },
            });
          } else {
            await this.prisma.arrear.delete({ where: { id: existing.id } });
          }
        }
        continue;
      }

      if (!existing) {
        await this.prisma.arrear.create({
          data: {
            organizationId,
            tenantId: tenantRow.id,
            month,
            amountDue,
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
            amountDue,
            status: paid >= amountDue ? "cleared" : paid > 0 ? "partial" : "pending",
          },
        });
      }
    }
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

  private toNumber(value: any) {
    if (value === null || value === undefined || value === "") return 0;
    return Number(value) || 0;
  }
}
