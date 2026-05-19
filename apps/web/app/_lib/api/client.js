// Central HTTP client. Every API call to the NestJS backend goes through
// `apiFetch` so auth cookies, tenant headers, JSON encoding, and error
// shaping all live in one place.

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// Tenant resolution priority — highest wins:
//   1. `organizationId` in localStorage (set on login/signup)
//   2. `tenantSlug` in localStorage
//   3. root production hostname
//   4. `VITE_DEFAULT_TENANT_SLUG` env var
const APEX_HOSTS = new Set(["makazicloud.com", "www.makazicloud.com"]);
const APEX_TENANT_SLUG = "makazicloud";

const inferTenantSlugFromHostname = (hostname) => {
  const host = String(hostname || "").toLowerCase();
  return APEX_HOSTS.has(host) ? APEX_TENANT_SLUG : null;
};

export const getTenantHeaders = () => {
  if (typeof window === "undefined") return {};

  const organizationId = window.localStorage.getItem("organizationId");
  if (organizationId) return { "x-organization-id": organizationId };

  const tenantSlug =
    window.localStorage.getItem("tenantSlug") ||
    inferTenantSlugFromHostname(window.location.hostname) ||
    import.meta.env.VITE_DEFAULT_TENANT_SLUG;
  if (tenantSlug) return { "x-tenant-slug": tenantSlug };

  return {};
};

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

const isAbsolute = (path) => /^https?:\/\//i.test(path);

/**
 * Make a request to the API. Returns the parsed JSON body on success,
 * or null for 204 / empty responses. Throws ApiError on non-2xx.
 *
 * @param {string} path     "/auth/login" or full URL
 * @param {object} opts     { method, body, headers, signal, raw }
 *   - body:    plain object (will be JSON.stringified) or FormData
 *   - raw:     if true, return the Response object instead of parsed JSON
 *              (used for binary downloads like PDF)
 */
export async function apiFetch(path, opts = {}) {
  const { method = "GET", body, headers = {}, signal, raw = false } = opts;
  const url = isAbsolute(path) ? path : `${API_BASE_URL}${path}`;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const finalHeaders = {
    ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...getTenantHeaders(),
    ...headers,
  };

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    credentials: "include",
    signal,
  });

  if (raw) return response;

  const ct = response.headers.get("content-type") || "";
  const payload =
    response.status === 204
      ? null
      : ct.includes("application/json")
        ? await response.json().catch(() => null)
        : null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message || payload?.error || `Request failed: ${response.status}`,
      { status: response.status, body: payload },
    );
  }

  return payload;
}
