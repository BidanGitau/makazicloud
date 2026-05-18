// Resolve which organization a request belongs to from the URL's host.
//
// Production:  acme.makazicloud.com         → slug "acme"
//              www.makazicloud.com          → null (marketing site)
//              makazicloud.com              → null
// Local dev:   acme.localhost:5173          → slug "acme"
//              localhost:5173               → null
//              127.0.0.1:5173               → null
//
// Slugs that look like infrastructure ("www", "api", "app", "admin"…)
// resolve to null so the marketing site can keep its conventional URLs
// without one accidentally booking the "admin" namespace.

const RESERVED_SLUGS = new Set([
  "",
  "www",
  "api",
  "app",
  "admin",
  "mail",
  "login",
  "auth",
  "static",
  "assets",
  "cdn",
  "ws",
  "blog",
  "help",
  "docs",
  "status",
]);

export function getOrgSlugFromHost(hostname) {
  if (typeof hostname !== "string" || !hostname) return null;
  // Strip an explicit port — `acme.localhost:5173` → `acme.localhost`.
  const host = hostname.split(":")[0];

  // IPs never carry a slug.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;

  const parts = host.split(".").filter(Boolean);

  // Localhost dev: `acme.localhost` is exactly 2 parts but valid.
  if (parts.length === 2 && parts[1] === "localhost") {
    const sub = parts[0].toLowerCase();
    return RESERVED_SLUGS.has(sub) ? null : sub;
  }

  // Production: need at least `sub.root.tld`. `makazicloud.com` (2 parts)
  // is the marketing root and resolves to null.
  if (parts.length < 3) return null;

  const sub = parts[0].toLowerCase();
  return RESERVED_SLUGS.has(sub) ? null : sub;
}

// Browser-only convenience wrapper. Returns null during SSR.
export function getOrgSlugFromBrowser() {
  if (typeof window === "undefined") return null;
  return getOrgSlugFromHost(window.location.hostname);
}

// Build the full URL for an org-scoped page on the right subdomain.
// Used after signup / when admin switches between orgs they belong to.
//
//   buildOrgUrl("acme", "/dashboard")  →  https://acme.makazicloud.com/dashboard
//   buildOrgUrl("acme", "/dashboard")  →  http://acme.localhost:5173/dashboard  (dev)
//
// Falls back to the current host with no slug when running in unknown
// environments — never returns null.
export function buildOrgUrl(slug, pathname = "/") {
  if (typeof window === "undefined") return pathname;
  const { protocol, hostname, port } = window.location;
  const portPart = port ? `:${port}` : "";
  const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (!slug) {
    return `${protocol}//${rootHost(hostname)}${portPart}${safePath}`;
  }
  return `${protocol}//${slug}.${rootHost(hostname)}${portPart}${safePath}`;
}

// Strip the leftmost subdomain to get the "root" host. Used when we
// need to rewrite acme.makazicloud.com → makazicloud.com (or
// acme.localhost → localhost in dev).
function rootHost(hostname) {
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length <= 1) return hostname;
  if (parts.length === 2 && parts[1] === "localhost") return "localhost";
  if (parts.length === 2) return hostname; // already root in prod
  return parts.slice(1).join(".");
}
