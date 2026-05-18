# Discrete Multi-Tenancy

MakaziCloud uses row-scoped discrete multi-tenancy. Each client organization owns its own data through `organizationId`, and business APIs must resolve a tenant before querying.

## Tenant Boundary

- `Organization` is the tenant.
- `User` can belong to many organizations through `Membership`.
- Tenant-owned tables include `organizationId`.
- Child tables duplicate `organizationId` so queries can be scoped directly and composite relations prevent cross-tenant joins.

## API Tenant Resolution

Business routes use `TenantGuard`.

Requests must send one of:

```http
x-organization-id: <organization-id>
x-tenant-slug: <organization-slug>
```

The guard resolves only active organizations and attaches:

```ts
{
  organizationId: string;
  organizationSlug: string;
}
```

Services then query with:

```ts
where: {
  organizationId: tenant.organizationId
}
```

## Rule

Never query tenant-owned tables without a tenant context. Public/platform routes such as health checks are the exception.

## Per-Org Subdomains

Each organization gets its own subdomain — `acme.makazicloud.com` belongs to the org with `slug = "acme"`. The slug is the leftmost label of the URL and the API receives it via `x-tenant-slug` on every request.

### How it routes

The web app reads the slug from `window.location.hostname` via [`apps/web/app/_lib/subdomain.js`](../apps/web/app/_lib/subdomain.js) and prepends `x-tenant-slug: <slug>` to every API call. Subdomain wins over any stored `organizationId` / `tenantSlug` in localStorage, so the URL is the source of truth — typing a different subdomain into the address bar always scopes correctly.

### Reserved slugs

Infrastructure subdomains (`www`, `api`, `app`, `admin`, `mail`, `login`, `auth`, `static`, `assets`, `cdn`, `ws`, `blog`, `help`, `docs`, `status`, `support`, `billing`, `tenant`, `signup`, `signin`) resolve to *no org* — they're reserved for the marketing site and tooling. Signup rejects any of these as `Organization.slug`. The set lives in both [`apps/api/src/auth/org-slug.ts`](../apps/api/src/auth/org-slug.ts) (server enforcement) and [`apps/web/app/_lib/subdomain.js`](../apps/web/app/_lib/subdomain.js) (client routing) — keep them in sync.

### Onboarding

`POST /auth/signup` derives the slug from explicit input → `organizationName` → email local-part, normalizes to DNS-shape (`a-z0-9-`), and rejects reserved names and conflicts (Org.slug is `@unique`). The response payload includes `organization.slug`, which the web app uses to redirect the new owner to `https://<slug>.makazicloud.com/dashboard` via `window.location` so the session cookie follows under `SameSite=Lax`.

### CORS

The API allows any `*.makazicloud.com` or `*.localhost` origin in [`apps/api/src/main.ts`](../apps/api/src/main.ts). Extra white-label custom domains can be added via the `WEB_ALLOWED_HOSTS` env var (comma-separated).

### Local dev

Most modern browsers resolve `*.localhost` to 127.0.0.1 with no `/etc/hosts` changes. Run the web dev server as usual and visit:

```
http://acme.localhost:5173      # the "acme" org
http://localhost:5173           # marketing root
```

If your browser refuses (older Safari) use `*.lvh.me` instead — that domain's A record points at 127.0.0.1.

### Production DNS

- Wildcard A or CNAME: `*.makazicloud.com → <your web host>`
- Wildcard TLS cert covering `*.makazicloud.com` (Vercel/Netlify/Cloudflare provision this automatically once the wildcard is verified).

### Tenant portal

The tenant portal lives at the **same** subdomain as the org. `acme.makazicloud.com/tenant-portal` is where tenants of "Acme" land. Multi-org tenants (the same person renting at two orgs) sign in at whichever subdomain they're trying to reach; the login picks the tenant linked to the org of that subdomain.
