import { API_BASE_URL, getTenantHeaders } from "@/app/_lib/api/client";

export function normalizeAvailableUnitTypes(types) {
  if (Array.isArray(types)) return types.filter(Boolean);
  if (typeof types === "string") {
    return types
      .replace(/[{}]/g, "")
      .split(",")
      .map((type) => type.trim())
      .filter(Boolean);
  }
  return [];
}

export const normalizeListingPayload = (payload) =>
  (payload.properties || []).map((property) => ({
    id: property.id,
    name: property.name,
    address: property.address,
    totalUnits: property.totalUnits || 0,
    vacantUnits: property.vacantUnits || 0,
    occupiedUnits: property.occupiedUnits || 0,
    availableUnitTypes: normalizeAvailableUnitTypes(
      property.availableUnitTypes,
    ),
    organization: property.organization || null,
  }));

export const fetchPublicListingsPage = async (cursor) => {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/public/properties${qs ? `?${qs}` : ""}`,
    {
      cache: "no-store",
      headers: getTenantHeaders(),
      credentials: "include",
    },
  );
  const payload = await response.json();
  if (!response.ok) {
    console.error("Public properties API error:", payload);
    throw new Error(payload.error || "Failed to load properties.");
  }
  return {
    items: normalizeListingPayload(payload),
    nextCursor: payload.nextCursor || null,
  };
};

export const fetchPublicPropertyDetails = async (propertyId) => {
  const response = await fetch(
    `${API_BASE_URL}/public/properties/${propertyId}`,
    {
      cache: "no-store",
      headers: getTenantHeaders(),
      credentials: "include",
    },
  );
  const payload = await response.json();

  if (!response.ok) {
    console.error("Public property detail API error:", payload);
    throw new Error(
      payload.error ||
        "This property is not currently listed with public vacancies.",
    );
  }

  return {
    property: payload.property,
    units: payload.units || [],
  };
};

export const getUnitKey = (unit) =>
  unit.id ||
  unit.unit_id ||
  `${unit.block_id || "main"}-${unit.unit_number || unit.unitNumber || "unit"}`;
