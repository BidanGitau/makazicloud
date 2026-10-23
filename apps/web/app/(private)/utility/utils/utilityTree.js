import { monthKey } from "@/app/_lib/month-range";

export const defaultFilters = () => ({
  property: "",
  block: "",
  unit: "",
  month: monthKey(),
});

export function filterBills(bills, filters) {
  return bills.filter((b) => {
    if (filters.property && b.property_id !== filters.property) return false;
    if (filters.block && b.block_id !== filters.block) return false;
    if (filters.unit && b.unit_id !== filters.unit) return false;
    if (filters.month && !b.billing_month?.startsWith(filters.month))
      return false;
    return true;
  });
}

export function billStats(bills) {
  const total = bills.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const paid = bills.reduce((s, b) => s + Number(b.paid_amount || 0), 0);
  const pending = bills.filter((b) => b.status !== "paid").length;
  return { total, paid, pending, count: bills.length };
}

/** Groups bills under their property and block, with per-level totals. */
export function buildUtilityTree(filteredBills, fullProperties) {
  return fullProperties
    .map((property) => {
      const propertyBills = filteredBills.filter(
        (bill) => bill.property_id === property.id,
      );
      const blocksById = new Map();
      const directBills = [];

      propertyBills.forEach((bill) => {
        if (!bill.block_id) {
          directBills.push(bill);
          return;
        }
        if (!blocksById.has(bill.block_id)) {
          blocksById.set(bill.block_id, {
            id: bill.block_id,
            name: bill.block_name || "Block",
            bills: [],
          });
        }
        blocksById.get(bill.block_id).bills.push(bill);
      });

      const blocks = [...blocksById.values()].map((block) => ({
        ...block,
        bill_count: block.bills.length,
        total_amount: block.bills.reduce(
          (sum, bill) => sum + Number(bill.total_amount || 0),
          0,
        ),
        paid_amount: block.bills.reduce(
          (sum, bill) => sum + Number(bill.paid_amount || 0),
          0,
        ),
        pending_count: block.bills.filter((bill) => bill.status !== "paid")
          .length,
      }));

      return {
        ...property,
        bills: directBills,
        blocks,
        bill_count: propertyBills.length,
        total_amount: propertyBills.reduce(
          (sum, bill) => sum + Number(bill.total_amount || 0),
          0,
        ),
        paid_amount: propertyBills.reduce(
          (sum, bill) => sum + Number(bill.paid_amount || 0),
          0,
        ),
        pending_count: propertyBills.filter((bill) => bill.status !== "paid")
          .length,
      };
    })
    .filter((property) => property.bill_count > 0);
}

/** Appends a total row to a bill table. */
export function billSummaryRow(bills) {
  if (!bills.length) return bills;
  return [
    ...bills,
    {
      isSummary: true,
      id: `summary-${bills.map((bill) => bill.id).join("-")}`,
      name: "Total",
      total_amount: bills.reduce(
        (sum, bill) => sum + Number(bill.total_amount || 0),
        0,
      ),
      paid_amount: bills.reduce(
        (sum, bill) => sum + Number(bill.paid_amount || 0),
        0,
      ),
      status: "",
    },
  ];
}
