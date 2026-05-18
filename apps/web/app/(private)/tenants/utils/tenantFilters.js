"use client";

export const filterTenants = (tenants, filters) =>
  tenants.filter((tenant) => {
    const searchMatch =
      !filters.search || matchesSearch(tenant, filters.search);
    const statusMatch = !filters.status || tenant.status === filters.status;
    const propertyMatch =
      !filters.property || tenant.property_name === filters.property;
    const blockMatch = !filters.block || tenant.block_name === filters.block;
    const arrearsMatch =
      !filters.arrears || matchesArrears(tenant, filters.arrears);
    return (
      searchMatch &&
      statusMatch &&
      propertyMatch &&
      blockMatch &&
      arrearsMatch
    );
  });

const matchesSearch = (tenant, term) => {
  const search = term.toLowerCase();
  return [
    tenant.full_name,
    tenant.unit_number,
    tenant.email,
    tenant.phone,
  ].some((field) => field?.toLowerCase().includes(search));
};

const matchesArrears = (tenant, criteria) => {
  const hasArrears = (tenant.overdueAmount || 0) > 0;
  return criteria === "with_arrears"
    ? hasArrears
    : criteria === "no_arrears"
      ? !hasArrears
      : true;
};

export const getUniqueValues = (tenants, key) =>
  [...new Set(tenants.map((t) => t[key]).filter(Boolean))].sort();

export const getDefaultFilters = () => ({
  search: "",
  status: "active",
  property: null,
  block: null,
  arrears: null,
});

export const hasActiveFilters = (filters) =>
  Object.values(filters).some((v) => v !== null && v !== "");

export const getFilterSummary = (filtered, total, filters) => {
  const activeCount = Object.values(filters).filter(
    (v) => v !== null && v !== "",
  ).length;
  if (activeCount === 0) return `Showing all ${total.length} tenants`;
  return `Showing ${filtered.length} of ${total.length} tenants (${activeCount} filter${activeCount > 1 ? "s" : ""} applied)`;
};
