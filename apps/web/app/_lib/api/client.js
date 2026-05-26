


export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";


export const getTenantHeaders = () => {
  if (typeof window === "undefined") return {};

  const organizationId = window.localStorage.getItem("organizationId");
  if (organizationId) return { "x-organization-id": organizationId };

  const tenantSlug =
    window.localStorage.getItem("tenantSlug") ||
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
