/** Disbursement view defaults to the current month. Release still waits until the month has ended. */
export const monthValue = (offset = 0) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export function dateRange(month, endMonth = month) {
  const value = /^\d{4}-\d{2}$/.test(month || "") ? month : monthValue();
  const endValue = /^\d{4}-\d{2}$/.test(endMonth || "") ? endMonth : value;
  const [year, monthIndex] = value.split("-").map(Number);
  const [endYear, endMonthIndex] = endValue.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  let end = new Date(Date.UTC(endYear, endMonthIndex, 0));
  if (end < start) end = new Date(Date.UTC(year, monthIndex, 0));
  const sameMonth = value === endValue;
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    label: sameMonth
      ? start.toLocaleDateString("en-KE", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        })
      : `${start.toLocaleDateString("en-KE", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })} - ${end.toLocaleDateString("en-KE", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })}`,
  };
}

export function netRowTotals(row) {
  if (!row) {
    return {
      expected: 0,
      gross: 0,
      collected: 0,
      commission: 0,
      expectedPayout: 0,
      defaulted: 0,
      deposits: 0,
      maintenance: 0,
      advances: 0,
      payout: 0,
      canDisburse: 0,
    };
  }
  const collected = Number(row.total_collected || 0);
  const net = Number(row.net_income || 0);
  return {
    expected: Number(row.expected_rent || 0),
    gross: collected,
    collected,
    commission: Number(row.commission_amount || 0),
    expectedPayout: Number(row.expected_payout || 0),
    defaulted: Number(row.defaulted_rent || 0),
    deposits: Number(row.deposits_collected || 0),
    maintenance: Number(row.total_maintenance_cost || 0),
    advances: Number(row.total_advances || 0),
    payout: net,
    canDisburse: Number(
      row.can_disburse ?? (collected > 0 ? Math.max(0, net) : 0),
    ),
  };
}

export function closeMonthKey(value) {
  const raw = String(value || "");
  const dayMatch = raw.match(/^(\d{4}-\d{2})-\d{2}/);
  if (dayMatch) return dayMatch[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 7);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function otherCostsAmount(row) {
  return Number(row.maintenance_amount || 0) + Number(row.advances_amount || 0);
}

function emptyPropertyGroup(property) {
  return {
    id: property.id,
    property_id: property.id,
    property_name: property.name || "Unknown Property",
    owner_name: property.owner_name || null,
    owner_phone: property.owner_phone || null,
    months: [],
    gross_collection: 0,
    commission_amount: 0,
    other_costs: 0,
    owner_payout: 0,
    latest_closed_at: null,
  };
}

export function groupSettlementsByProperty(rows, properties = [], filterPropertyId = "") {
  const propertiesById = Object.fromEntries(
    properties.map((property) => [property.id, property]),
  );
  const groups = new Map();

  if (filterPropertyId && propertiesById[filterPropertyId]) {
    groups.set(filterPropertyId, emptyPropertyGroup(propertiesById[filterPropertyId]));
  }

  for (const row of rows) {
    const propertyId = row.property_id || "unknown";
    if (filterPropertyId && propertyId !== filterPropertyId) continue;
    if (!groups.has(propertyId)) {
      const property = propertiesById[propertyId] || {};
      groups.set(propertyId, {
        ...emptyPropertyGroup({
          id: propertyId,
          name: property.name || row.property_name,
          owner_name: property.owner_name || row.owner_name,
          owner_phone: property.owner_phone || row.owner_phone,
        }),
      });
    }
    const group = groups.get(propertyId);
    group.months.push(row);
    group.gross_collection += Number(row.gross_collection || 0);
    group.commission_amount += Number(row.commission_amount || 0);
    group.other_costs += otherCostsAmount(row);
    group.owner_payout += Number(row.owner_payout || 0);
    const closedAt = row.closed_at || row.created_at;
    if (
      closedAt &&
      (!group.latest_closed_at || String(closedAt) > String(group.latest_closed_at))
    ) {
      group.latest_closed_at = closedAt;
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      months: [...group.months].sort((a, b) =>
        closeMonthKey(b.close_month).localeCompare(closeMonthKey(a.close_month)),
      ),
      commission_rate:
        group.gross_collection > 0
          ? (group.commission_amount / group.gross_collection) * 100
          : 0,
    }))
    .sort((a, b) =>
      String(a.property_name).localeCompare(String(b.property_name)),
    );
}

export function groupPropertyGroupsByOwner(properties) {
  const owners = new Map();

  for (const property of properties) {
    const ownerName = String(property.owner_name || "").trim() || "Unassigned owner";
    if (!owners.has(ownerName)) {
      owners.set(ownerName, {
        id: ownerName,
        owner_name: ownerName,
        properties: [],
        owner_payout: 0,
      });
    }
    const owner = owners.get(ownerName);
    owner.properties.push(property);
    owner.owner_payout += Number(property.owner_payout || 0);
  }

  return [...owners.values()]
    .map((owner) => ({
      ...owner,
      properties: [...owner.properties].sort((a, b) =>
        String(a.property_name).localeCompare(String(b.property_name)),
      ),
    }))
    .sort((a, b) => String(a.owner_name).localeCompare(String(b.owner_name)));
}

export function withinRange(value, startDate, endDate) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return false;
  return time >= new Date(startDate).getTime() && time <= new Date(`${endDate}T23:59:59`).getTime();
}

export function currencyOrDash(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `KSh ${Number(value || 0).toLocaleString("en-KE")}`;
}

export function numberOrBlank(value) {
  if (value === null || value === undefined || value === "") return "";
  return Number(value || 0);
}
