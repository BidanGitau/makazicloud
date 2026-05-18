import { createCRUD } from "../crud";
import { eachDayOfInterval } from "date-fns";

const tenantsRepo = createCRUD("tenants");

/**
 * Return all booked dates for a unit based on active tenant leases.
 */
export async function getRentedDatesByUnitId(unitId) {
  const data = await tenantsRepo.getAll({
    match: { unit_id: unitId, status: "active" },
  });

  return data
    .filter((t) => t.lease_start && t.lease_end)
    .map(({ lease_start, lease_end }) =>
      eachDayOfInterval({
        start: new Date(lease_start),
        end: new Date(lease_end),
      }),
    )
    .flat();
}

/**
 * Availability check: is the unit free across the requested range?
 * Fetches all active leases for the unit and tests overlap client-side
 * (the data API doesn't support compound OR predicates).
 */
export async function isUnitAvailable(unitId, startDate, endDate) {
  const leases = await tenantsRepo.getAll({
    match: { unit_id: unitId, status: "active" },
  });
  const start = new Date(startDate);
  const end = new Date(endDate);
  const overlaps = leases.some((t) => {
    if (!t.lease_start || !t.lease_end) return false;
    const ls = new Date(t.lease_start);
    const le = new Date(t.lease_end);
    return ls <= end && le >= start;
  });
  return !overlaps;
}
