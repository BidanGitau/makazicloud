export function enrichArrearRows(rows, today = new Date()) {
  return rows.map((a) => {
    const status = String(a.status || "").toLowerCase();
    return {
      ...a,
      tenantName: a.tenant_name || "Unknown",
      tenantEmail: a.tenant_email || "",
      tenantPhone: a.tenant_phone || "",
      propertyId: a.property_id || null,
      propertyName: a.property_name || "N/A",
      blockId: a.block_id || null,
      blockName: a.block_name || "N/A",
      unitNumber: a.unit_number || "N/A",
      isArrears:
        new Date(a.due_date || a.month) <= today &&
        ["pending", "partial"].includes(status),
      isAdvance: status === "prepaid",
    };
  });
}

export function filterArrears(rows, filters) {
  const { statusFilter, monthFilter, propertyFilter, blockFilter } = filters;

  return rows.filter((row) => {
    const statusMatches =
      statusFilter === "all"
        ? row.isArrears || row.isAdvance
        : statusFilter === "advance"
          ? row.isAdvance
          : row.isArrears;

    return (
      statusMatches &&
      (!monthFilter || row.month?.slice(0, 7) === monthFilter) &&
      (!propertyFilter || row.propertyId === propertyFilter) &&
      (!blockFilter || row.blockId === blockFilter)
    );
  });
}

export function groupArrearsByTenant(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const key =
      row.tenant_id || `${row.tenantName}-${row.propertyId}-${row.unitNumber}`;
    if (!groups.has(key)) {
      groups.set(key, {
        ...row,
        id: key,
        rows: [],
        monthCount: 0,
        totalDue: 0,
        totalPaid: 0,
        totalBalance: 0,
        totalCredit: 0,
      });
    }

    const group = groups.get(key);
    const amountDue = Number(row.amount_due || 0);
    const amountPaid = Number(row.amount_paid || 0);
    const balance = Number(row.balance || amountDue - amountPaid);
    const credit = row.isAdvance ? Math.max(0, amountPaid - amountDue) : 0;

    group.rows.push(row);
    group.monthCount += 1;
    group.totalDue += amountDue;
    group.totalPaid += amountPaid;
    group.totalCredit += credit;
    group.totalBalance += row.isAdvance ? 0 : Math.max(0, balance);
  });

  return [...groups.values()].map((group) => ({
    ...group,
    rows: group.rows.sort((a, b) => String(a.month).localeCompare(String(b.month))),
  }));
}

export function summarizeArrears(rows) {
  return {
    tenantsInArrears: new Set(
      rows
        .filter((r) => r.isArrears && r.balance > 0)
        .map((r) => r.tenant_id || r.tenantName),
    ).size,
    tenantsInAdvance: new Set(
      rows.filter((r) => r.isAdvance).map((r) => r.tenant_id || r.tenantName),
    ).size,
  };
}

export function uniqueEmailTenants(rows) {
  const seen = new Set();
  return rows.reduce((acc, r) => {
    if (!seen.has(r.tenant_id)) {
      seen.add(r.tenant_id);
      acc.push({
        tenant_id: r.tenant_id,
        tenantName: r.tenantName,
        tenantEmail: r.tenantEmail,
      });
    }
    return acc;
  }, []);
}
