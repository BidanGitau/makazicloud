// Shared loader for the per-tenant PDF routes (invoice + statement).
// Both routes used to inline the same:
//   - tenantHeadersFromRequest()
//   - apiRows() / apiSingle()
//   - getBranding()
//   - the same Promise.all of (overview, tenant, [arrears?,] branding)
// This module owns that surface so a future route doing one more PDF
// kind (receipt, lease) gets the context for free.

const API_BASE_URL =
  process.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export function tenantHeadersFromRequest(request) {
  const headers = {};
  const organizationId = request.headers.get("x-organization-id");
  const tenantSlug = request.headers.get("x-tenant-slug");
  const cookie = request.headers.get("cookie");
  if (organizationId) headers["x-organization-id"] = organizationId;
  if (tenantSlug) headers["x-tenant-slug"] = tenantSlug;
  if (cookie) headers["cookie"] = cookie;
  return headers;
}

export async function apiRows(request, table, params = {}) {
  const url = new URL(`${API_BASE_URL}/data/${table}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url, {
    headers: tenantHeadersFromRequest(request),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.message || payload?.error || `Failed to load ${table}`,
    );
  }
  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
}

export async function apiSingle(request, table, params = {}) {
  return (await apiRows(request, table, { ...params, limit: 1 }))[0] || null;
}

export async function getBranding(request) {
  const response = await fetch(`${API_BASE_URL}/organization/branding`, {
    headers: tenantHeadersFromRequest(request),
  });
  if (!response.ok) {
    return {
      displayName: "MakaziCloud Property Management",
      logoDataUrl: null,
    };
  }
  const branding = await response.json().catch(() => ({}));
  return {
    displayName:
      branding.displayName ||
      branding.institutionName ||
      branding.name ||
      "MakaziCloud Property Management",
    logoDataUrl: branding.logoDataUrl || null,
  };
}

// One round-trip for every tenant PDF route. Pass `includeArrears: true`
// for statement-style flows that need the arrear ledger; leave it off for
// invoice (which doesn't read arrears).
//
// Always returns `resolvedOverview` — if the v_tenant_overview view has
// no row for this tenant yet (newly-created), we synthesize one from the
// tenant record so downstream code can render without null checks.
export async function loadTenantPDFContext(
  request,
  tenantId,
  { includeArrears = false } = {},
) {
  const [overview, tenant, branding, arrears] = await Promise.all([
    apiSingle(request, "v_tenant_overview", { tenant_id: tenantId }),
    apiSingle(request, "tenants", { id: tenantId }),
    getBranding(request),
    includeArrears
      ? apiRows(request, "arrears", {
          tenant_id: tenantId,
          orderBy: "month",
          order: "asc",
        })
      : Promise.resolve(null),
  ]);

  if (!tenant) throw new Error("Tenant not found.");

  const resolvedOverview = overview || {
    tenant_id: tenant.id,
    full_name: tenant.full_name,
    property_name: "",
    block_name: "",
    unit_number: "",
    rent_amount: 0,
    lease_start: tenant.lease_start,
  };

  return { tenant, overview, resolvedOverview, branding, arrears };
}
