import { createCRUD } from "../crud";

const paymentsRepo = createCRUD("payments");

/**
 * Sum of payments made by a tenant, optionally restricted to a single month.
 * @param {string} tenantId
 * @param {{ month?: string }} options - month ISO string 'YYYY-MM-DD'
 * @returns {Promise<number>}
 */
export async function getTotalPaymentsForTenant(tenantId, { month } = {}) {
  const filter = month
    ? [
        { column: "payment_date", operator: ">=", value: month },
        { column: "payment_date", operator: "<", value: addOneMonthISO(month) },
      ]
    : [];

  const rows = await paymentsRepo.getAll({
    match: { tenant_id: tenantId },
    filter,
  });

  return rows.reduce(
    (total, record) => total + Number(record.amount || 0),
    0,
  );
}

function addOneMonthISO(monthISO) {
  const d = new Date(monthISO);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
