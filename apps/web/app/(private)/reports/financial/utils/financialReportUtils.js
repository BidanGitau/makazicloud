import { formatCurrency } from "@/app/_lib/formatters";

export const formatPct = (value) => `${(Number(value) || 0).toFixed(1)}%`;

export const exportColumns = [
  { header: "Property", key: "property", width: "18%" },
  { header: "Units", key: "units", width: "7%" },
  { header: "Tenants", key: "tenants", width: "8%" },
  { header: "Occupancy", key: "occupancy", width: "9%" },
  {
    header: "Collected (KSh)",
    key: "collected",
    type: "currency",
    width: "12%",
  },
  {
    header: "Outstanding (KSh)",
    key: "outstanding",
    type: "currency",
    width: "12%",
  },
  {
    header: "Commission (KSh)",
    key: "commission",
    type: "currency",
    width: "12%",
  },
  {
    header: "Maintenance (KSh)",
    key: "maintenance",
    type: "currency",
    width: "12%",
  },
  {
    header: "Advances (KSh)",
    key: "advances",
    type: "currency",
    width: "11%",
  },
  {
    header: "Net Income (KSh)",
    key: "netIncome",
    type: "currency",
    width: "11%",
  },
];

export function mapNetIncomeByProperty(rows) {
  const map = {};
  rows.forEach((row) => {
    map[row.property_id] = row;
  });
  return map;
}

export function filterFinancialRows(rows, { occupancyFilter, search }) {
  let nextRows = rows;

  if (occupancyFilter === "active") {
    nextRows = nextRows.filter((item) => Number(item.active_tenants || 0) > 0);
  } else if (occupancyFilter === "vacant") {
    nextRows = nextRows.filter((item) => Number(item.active_tenants || 0) === 0);
  } else if (occupancyFilter === "with_outstanding") {
    nextRows = nextRows.filter((item) => Number(item.total_outstanding || 0) > 0);
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase();
    nextRows = nextRows.filter((item) =>
      String(item.property_name || "").toLowerCase().includes(q),
    );
  }

  return nextRows;
}

export function summarizeFinancialRows(filteredData, netIncome) {
  const visiblePropertyIds = new Set(filteredData.map((row) => row.property_id));
  const visibleNetRows = netIncome.filter((row) =>
    visiblePropertyIds.has(row.property_id),
  );
  const totalProperties = filteredData.length;
  const totalRevenue = filteredData.reduce(
    (sum, item) => sum + Number(item.total_collected || 0),
    0,
  );
  const totalTenants = filteredData.reduce(
    (sum, item) => sum + Number(item.active_tenants || 0),
    0,
  );
  const averageOccupancy =
    filteredData.reduce((sum, item) => sum + Number(item.occupancy_rate || 0), 0) /
    (totalProperties || 1);
  const totalMaintenance = visibleNetRows.reduce(
    (sum, row) => sum + Number(row.total_maintenance_cost || 0),
    0,
  );
  const totalCommission = visibleNetRows.reduce(
    (sum, row) => sum + Number(row.commission_amount || 0),
    0,
  );
  const totalAdvances = visibleNetRows.reduce(
    (sum, row) => sum + Number(row.total_advances || 0),
    0,
  );
  const netIncomeTotal = visibleNetRows.reduce(
    (sum, row) => sum + Number(row.net_income || 0),
    0,
  );

  return {
    totalRevenue,
    totalCommission,
    totalMaintenance,
    totalAdvances,
    netIncome: netIncomeTotal,
    totalProperties,
    totalTenants,
    averageOccupancy,
  };
}

export function buildFinancialExportData(filteredData, summary, netByProperty) {
  const rows = filteredData.map((row) => {
    const net = netByProperty[row.property_id] || {};
    return {
      property: row.property_name || "N/A",
      units: Number(row.total_units || 0),
      tenants: Number(row.active_tenants || 0),
      occupancy: formatPct(row.occupancy_rate),
      collected: Number(row.total_collected || 0),
      outstanding: Number(row.total_outstanding || 0),
      commission: Number(net.commission_amount || 0),
      commissionRate: formatPct(net.commission_rate),
      maintenance: Number(net.total_maintenance_cost || 0),
      advances: Number(net.total_advances || 0),
      netIncome: Number(net.net_income || 0),
      collectionRate: formatPct(row.collection_rate),
    };
  });

  if (rows.length > 0) {
    rows.push({
      property: "TOTAL",
      units: filteredData.reduce((sum, row) => sum + Number(row.total_units || 0), 0),
      tenants: summary.totalTenants,
      occupancy: formatPct(summary.averageOccupancy),
      collected: Number(summary.totalRevenue || 0),
      outstanding: filteredData.reduce(
        (sum, row) => sum + Number(row.total_outstanding || 0),
        0,
      ),
      commission: Number(summary.totalCommission || 0),
      commissionRate: "-",
      maintenance: Number(summary.totalMaintenance || 0),
      advances: Number(summary.totalAdvances || 0),
      netIncome: Number(summary.netIncome || 0),
      collectionRate: "-",
    });
  }

  return rows;
}

export function buildFinancialPdfMetadata({
  properties,
  propertyBlocks,
  propertyId,
  blockId,
  startDate,
  endDate,
  summary,
}) {
  return {
    Generated: new Date().toLocaleDateString("en-KE"),
    Property: properties.find((p) => p.id === propertyId)?.name || "All Properties",
    Block: propertyBlocks.find((b) => b.id === blockId)?.name || "All Blocks",
    Period: startDate && endDate ? `${startDate} to ${endDate}` : "All time",
    "Total Revenue": formatCurrency(summary.totalRevenue),
    Commission: formatCurrency(summary.totalCommission),
    "Maintenance Cost": formatCurrency(summary.totalMaintenance),
    "Owner Advances": formatCurrency(summary.totalAdvances),
    "Net Income": formatCurrency(summary.netIncome),
    Properties: summary.totalProperties,
    "Active Tenants": summary.totalTenants,
    "Avg Occupancy": formatPct(summary.averageOccupancy),
  };
}
