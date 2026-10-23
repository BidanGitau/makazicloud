import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  billedAmountDue,
  firstMonthRent,
  billingCycleMonths,
  isBillingMonth,
  isFirstBillingMonth,
  moveInDueDate,
  nextBillingMonthAfter,
  rentCycleAmount,
  unitDepositAmount,
} from "../billing/billing-cycle";
import { PrismaService } from "../prisma/prisma.service";
import type { TenantContext } from "../tenancy/tenant-context";
import { PropertyAccessService } from "../tenancy/property-access.service";

@Injectable()
export class RentLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyAccess: PropertyAccessService,
  ) {}

  async applyPayment(tenant: TenantContext, payment: any) {
    let remaining = this.toNumber(payment.amount);
    if (remaining <= 0 || !payment.tenantId) return;
    if (String(payment.status || "active") === "voided") return;

    const existingAllocations = await this.prisma.paymentAllocation.count({
      where: {
        organizationId: tenant.organizationId,
        paymentId: payment.id,
      },
    });
    if (existingAllocations > 0) return;

    const tenantRow = await this.prisma.tenant.findFirst({
      where: this.propertyAccess.scopeWhere("tenants", tenant, {
        id: payment.tenantId,
        organizationId: tenant.organizationId,
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

    if (!tenantRow?.unit) return;

    const cycleAmount = rentCycleAmount(tenantRow);
    const depositAmount = unitDepositAmount(tenantRow);
    if (cycleAmount <= 0 && depositAmount <= 0) return;
    const isActiveTenant = String(tenantRow.status || "").toLowerCase() === "active";
    const cycleMonths = billingCycleMonths(tenantRow);
    const addMonths = this.addMonths.bind(this);

    const paymentMonth = this.monthStart(new Date(payment.paymentDate || new Date()));
    if (isActiveTenant) {
      await this.ensureTenantArrearMonths(tenant.organizationId, tenantRow, paymentMonth);
    }

    const leaseStartMonth = this.monthStart(
      new Date(tenantRow.leaseStart || paymentMonth),
    );

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

      const previouslyPaid = this.toNumber(row.amountPaid);
      const balance = Math.max(0, this.toNumber(row.amountDue) - previouslyPaid);
      if (balance <= 0) continue;

      const applied = Math.min(remaining, balance);
      const nextPaid = previouslyPaid + applied;
      const nextStatus = nextPaid >= this.toNumber(row.amountDue) ? "cleared" : "partial";

      await this.prisma.arrear.update({
        where: { id: row.id },
        data: {
          amountPaid: nextPaid,
          status: nextStatus,
        },
      });

      const rentDueOnRow = isFirstBillingMonth(
        leaseStartMonth,
        this.monthStart(row.month),
        cycleMonths,
      )
        ? firstMonthRent(tenantRow)
        : this.toNumber(row.amountDue);
      const rentStillOwed = Math.max(0, rentDueOnRow - previouslyPaid);
      const toRent = Math.min(applied, rentStillOwed);
      const toDeposit = applied - toRent;
      const rentType = row.month < paymentMonth ? "arrears" : "rent";

      if (toRent > 0) {
        await this.prisma.paymentAllocation.create({
          data: {
            organizationId: tenant.organizationId,
            paymentId: payment.id,
            tenantId: tenantRow.id,
            allocationType: rentType,
            referenceId: row.id,
            leaseMonth: row.month,
            amount: toRent,
            status: "applied",
          },
        });
      }

      if (toDeposit > 0) {
        await this.prisma.paymentAllocation.create({
          data: {
            organizationId: tenant.organizationId,
            paymentId: payment.id,
            tenantId: tenantRow.id,
            allocationType: "deposit",
            referenceId: row.id,
            leaseMonth: row.month,
            amount: toDeposit,
            status: "applied",
          },
        });
      }

      remaining -= applied;
    }

    if (!isActiveTenant) return;
    if (cycleAmount <= 0) return;

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
              dueDate:
                moveInDueDate(tenantRow, creditMonth) ??
                this.dueDateForMonth(
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
      where: this.propertyAccess.scopeWhere("payments", tenant, {
        organizationId: tenant.organizationId,
        status: "active",
        allocations: { none: {} },
      }),
      orderBy: { paymentDate: "asc" },
    });

    for (const payment of payments as any[]) {
      await this.applyPayment(tenant, payment);
    }

    return payments.length;
  }

  /**
   * Cancels a payment and undoes exactly what applyPayment did with it:
   * each allocation is taken back off the arrear row it was applied to.
   * The payment and its allocations are kept (voided / reversed) for audit.
   */
  async voidPayment(tenant: TenantContext, paymentId: string, reason: string) {
    const voidReason = String(reason || "").trim();
    if (!voidReason) {
      throw new BadRequestException("A reason is required to void a payment.");
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: this.propertyAccess.scopeWhere("payments", tenant, {
          id: paymentId,
          organizationId: tenant.organizationId,
        }),
        include: {
          allocations: true,
          tenant: { select: { unit: { select: { propertyId: true } } } },
        },
      });
      if (!payment) throw new NotFoundException("Payment was not found");
      if (payment.status === "voided") {
        throw new ConflictException("This payment has already been voided.");
      }

      await this.assertPaymentMonthsNotSettled(tx, tenant.organizationId, payment);

      const claimed = await tx.payment.updateMany({
        where: {
          id: payment.id,
          organizationId: tenant.organizationId,
          status: "active",
        },
        data: {
          status: "voided",
          voidedAt: new Date(),
          voidedById: tenant.userId || null,
          voidReason,
        },
      });
      if (claimed.count === 0) {
        throw new ConflictException("This payment has already been voided.");
      }

      for (const allocation of payment.allocations) {
        if (String(allocation.status || "").toLowerCase() === "reversed") continue;
        if (!allocation.referenceId) continue;

        const arrear = await tx.arrear.findFirst({
          where: {
            id: allocation.referenceId,
            organizationId: tenant.organizationId,
          },
        });
        if (!arrear) continue;

        const amountDue = this.toNumber(arrear.amountDue);
        const nextPaid = Math.max(
          0,
          this.toNumber(arrear.amountPaid) - this.toNumber(allocation.amount),
        );
        const arrearStatus = String(arrear.status || "").toLowerCase();
        const isPrepaid = arrearStatus === "prepaid";

        if (arrearStatus === "defaulted") {
          await tx.arrear.update({
            where: { id: arrear.id },
            data: { amountPaid: nextPaid },
          });
          continue;
        }

        if (isPrepaid && amountDue <= 0 && nextPaid <= 0) {
          await tx.arrear.delete({ where: { id: arrear.id } });
          continue;
        }

        await tx.arrear.update({
          where: { id: arrear.id },
          data: {
            amountPaid: nextPaid,
            status: isPrepaid && nextPaid > 0
              ? "prepaid"
              : nextPaid >= amountDue && amountDue > 0
                ? "cleared"
                : nextPaid > 0
                  ? "partial"
                  : "pending",
          },
        });
      }

      await tx.paymentAllocation.updateMany({
        where: { organizationId: tenant.organizationId, paymentId: payment.id },
        data: { status: "reversed" },
      });

      // Send a linked M-Pesa transaction back to the unassigned queue so it
      // can be matched to the right tenant again.
      await tx.mpesaTransaction.updateMany({
        where: { organizationId: tenant.organizationId, paymentId: payment.id },
        data: {
          status: "unmatched",
          matchReason: `Payment voided: ${voidReason}`,
          matchedTenantId: null,
          paymentId: null,
        },
      });

      return tx.payment.findFirst({
        where: { id: payment.id, organizationId: tenant.organizationId },
      });
    });
  }

  private async assertPaymentMonthsNotSettled(
    tx: any,
    organizationId: string,
    payment: any,
  ) {
    const propertyId = payment.tenant?.unit?.propertyId;
    if (!propertyId) return;

    const months = new Map<number, Date>();
    const paymentMonth = this.monthStart(new Date(payment.paymentDate));
    months.set(paymentMonth.getTime(), paymentMonth);
    for (const allocation of payment.allocations || []) {
      if (!allocation.leaseMonth) continue;
      const month = this.monthStart(new Date(allocation.leaseMonth));
      months.set(month.getTime(), month);
    }

    const settled = await tx.ownerSettlement.findFirst({
      where: {
        organizationId,
        propertyId,
        closeMonth: { in: [...months.values()] },
      },
      select: { closeMonth: true },
      orderBy: { closeMonth: "asc" },
    });
    if (settled) {
      const label = new Date(settled.closeMonth).toLocaleDateString("en-KE", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
      throw new ConflictException(
        `${label} has already been disbursed to the owner, so this payment can no longer be voided.`,
      );
    }
  }

  async ensureTenantArrearMonths(
    organizationId: string,
    tenantRow: any,
    throughMonth: Date,
  ) {
    if (!tenantRow?.unit) return;

    const cycleAmount = rentCycleAmount(tenantRow);
    const depositAmount = unitDepositAmount(tenantRow);
    if (cycleAmount <= 0 && depositAmount <= 0) return;
    const cycleMonths = billingCycleMonths(tenantRow);

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

      const amountDue = billedAmountDue(tenantRow, month, startMonth);
      if (amountDue <= 0) continue;

      if (!existing) {
        await this.prisma.arrear.create({
          data: {
            organizationId,
            tenantId: tenantRow.id,
            month,
            amountDue,
            amountPaid: 0,
            status: "pending",
            dueDate:
              moveInDueDate(tenantRow, month) ??
              this.dueDateForMonth(
                month,
                tenantRow.unit.property?.rentDueDay ?? tenantRow.rentDueDate,
              ),
          },
        });
        continue;
      }

      const existingDue = this.toNumber(existing.amountDue);
      const existingPaid = this.toNumber(existing.amountPaid);
      const existingStatus = String(existing.status || "").toLowerCase();

      if (existingStatus === "defaulted") continue;

      if (
        existingStatus !== "prepaid" &&
        existingPaid <= 0 &&
        isFirstBillingMonth(startMonth, month, cycleMonths) &&
        amountDue > existingDue
      ) {
        await this.prisma.arrear.update({
          where: { id: existing.id },
          data: { amountDue, status: "pending" },
        });
        continue;
      }

      if (existingStatus === "prepaid") {
        await this.prisma.arrear.update({
          where: { id: existing.id },
          data: {
            amountDue,
            status: existingPaid >= amountDue ? "cleared" : existingPaid > 0 ? "partial" : "pending",
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
