import { Prisma } from "@prisma/client";

import type { TenantContext } from "../tenancy/tenant-context";
import { toNumber } from "./data.mappers";

export function parseQueryDate(value: any, endOfDay = false) {
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

export function monthStart(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

export function addMonths(value: Date, months: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
}

export function dueDateForMonth(month: Date, dueDay?: number | null) {
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

export function collectionMonth(
  paymentDate: Date,
  _rentDueDay?: number | null,
  leaseMonth?: Date | null,
) {
  if (leaseMonth) return monthStart(new Date(leaseMonth));
  return monthStart(new Date(paymentDate));
}

export function collectionMonthInRange(
  collectionMonthValue: Date,
  startDate: Date | null,
  endDate: Date | null,
) {
  const month = monthStart(collectionMonthValue);
  if (startDate && month < monthStart(startDate)) return false;
  if (endDate && month > monthStart(endDate)) return false;
  return true;
}

export function widenedPaymentDateFilter(startDate: Date | null, endDate: Date | null) {
  if (!startDate && !endDate) return undefined;
  return {
    ...(startDate ? { gte: addMonths(monthStart(startDate), -1) } : {}),
    ...(endDate ? { lte: addMonths(monthStart(endDate), 2) } : {}),
  };
}

export function paymentCollectionChunks(
  payment: any,
  options: { byPaymentDate?: boolean } = {},
) {
  const dueDay = payment?.tenant?.unit?.property?.rentDueDay;
  const paymentDate = payment?.paymentDate;
  const allocations = Array.isArray(payment?.allocations) ? payment.allocations : [];
  const chunks: { amount: number; month: Date; type?: string }[] = [];
  let allocated = 0;

  for (const allocation of allocations) {
    const amount = toNumber(allocation.amount);
    allocated += amount;
    chunks.push({
      amount,
      month: collectionMonth(
        paymentDate,
        dueDay,
        options.byPaymentDate ? null : allocation.leaseMonth,
      ),
      type: allocation.allocationType,
    });
  }

  const remainder = toNumber(payment?.amount) - allocated;
  if (!allocations.length) {
    chunks.push({
      amount: toNumber(payment?.amount),
      month: collectionMonth(paymentDate, dueDay, null),
    });
  } else if (remainder > 0.009) {
    chunks.push({
      amount: remainder,
      month: collectionMonth(paymentDate, dueDay, null),
    });
  }

  return chunks;
}

export function lastCloseableMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1));
}

export function closeMonthStart(value: any) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), 1));
}

export function dueArrearSql(
  alias: string,
  startDate: Date | null = null,
  endDate: Date | null = null,
) {
  const today = new Date();
  const cutoff = endDate && endDate < today ? endDate : today;
  const dueDate = Prisma.raw(`"${alias}"."due_date"`);
  const month = Prisma.raw(`"${alias}"."month"`);
  const fallbackDue = Prisma.raw(
    `(date_trunc('month', "${alias}"."month") + interval '4 days')::date`,
  );

  return Prisma.sql`
    AND (
      (${dueDate} IS NOT NULL
        ${startDate ? Prisma.sql`AND ${month} >= ${startDate}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND ${month} <= ${endDate}` : Prisma.empty}
        AND ${dueDate} <= ${cutoff}
      )
      OR
      (${dueDate} IS NULL
        ${startDate ? Prisma.sql`AND ${month} >= ${startDate}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND ${month} <= ${endDate}` : Prisma.empty}
        AND ${fallbackDue} <= ${cutoff}
      )
    )
  `;
}

export function propertyFilterSql(
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
