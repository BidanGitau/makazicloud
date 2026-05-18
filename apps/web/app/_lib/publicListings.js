import { API_BASE_URL, getTenantHeaders } from "./api/client";

export async function getPublicPropertyListings() {
  const response = await fetch(`${API_BASE_URL}/public/properties`, {
    headers: getTenantHeaders(),
    credentials: "include",
  });

  if (!response.ok) return [];

  const payload = await response.json();
  const properties = payload.properties || [];
  return (properties || []).map((property) => ({
    id: property.id,
    name: property.name,
    address: property.address,
    total_units: property.totalUnits || 0,
    vacant_units: property.vacantUnits || 0,
    available_unit_types: property.availableUnitTypes || [],
  }));
}

export async function getPublicPropertyDetails(propertyId) {
  const response = await fetch(`${API_BASE_URL}/public/properties/${propertyId}`, {
    headers: getTenantHeaders(),
    credentials: "include",
  });

  if (!response.ok) return null;
  return response.json();
}
