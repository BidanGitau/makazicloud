export const isVacantUnit = (unit) =>
  ["vacant", "available"].includes(String(unit?.status || "").toLowerCase());

export function filterUnits(units, { statusFilter, typeFilter, searchQuery }) {
  return units.filter((unit) => {
    const matchesStatus =
      statusFilter === "all" ||
      String(unit?.status || "").toLowerCase() === statusFilter;
    const matchesType =
      typeFilter === "all" ||
      unit.type?.toLowerCase()?.includes(typeFilter.toLowerCase());
    const matchesSearch =
      searchQuery === "" ||
      unit.unit_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });
}

/** Appends a total row (unit count and rent) to a unit table. */
export function buildUnitsData(units) {
  if (!units.length) return units;
  const totalRent = units.reduce(
    (sum, unit) => sum + Number(unit?.rent_amount || 0),
    0,
  );

  return [
    ...units,
    {
      isSummary: true,
      unit_number: "Total",
      total_units: units.length,
      rent_amount: totalRent,
    },
  ];
}

export const unitRowStyles = [
  {
    when: (row) => row.isSummary,
    style: {
      fontWeight: 600,
      backgroundColor: "#f5f5f4",
      borderTop: "1px solid #e7e5e4",
    },
  },
];
