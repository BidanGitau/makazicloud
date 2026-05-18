# Security Review

Date: 2026-05-17  
Scope: local static review of `apps/api`, `apps/web`, Prisma schema, and security-sensitive routes. This is not a full penetration test, but it documents concrete vulnerabilities visible in the codebase.

## Executive Summary

The highest-risk area is the generic NestJS `/api/data/:table` layer. It correctly starts with tenant scoping, but user-controlled query params can overwrite `organizationId`, and write operations accept sensitive fields too broadly. The API also has authentication without permission enforcement on several admin-level controllers, and public server-side email/SMS endpoints can be abused to send messages using application credentials.

Dependency audit result: `npm audit --audit-level=moderate --omit=dev` reported `0 vulnerabilities`.

## Findings

### Critical: Tenant Scope Can Be Overridden By Query Params

Evidence:
- `DataService.buildWhere()` initializes `where.organizationId` from the authenticated tenant, then iterates through every query param and assigns it into the same `where` object: [data.service.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/data/data.service.ts:746).
- Query keys are converted from snake case to camel case, so `organization_id=<other-org>` becomes `organizationId` and overwrites the trusted tenant value: [data.service.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/data/data.service.ts:755).
- `list()` uses this `where` for generic table reads: [data.service.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/data/data.service.ts:76).

Impact: Any authenticated user can potentially read another organization’s rows through `/api/data/:table` if they know or can guess another `organizationId`. Operator params such as `organization_id[neq]=...` may broaden access further.

Fix:
- Ignore or reject `organizationId` / `organization_id` in query params.
- Build tenant scope last, after applying filters.
- Add tests proving `organization_id`, `organizationId`, and operator variants cannot escape the authenticated tenant.

### Critical: Generic Updates Allow Mass Assignment Of Protected Fields

Evidence:
- `update()` checks the row belongs to the tenant via `this.get(...)`, but then updates by `where: { id }` and passes the full request body after camel-casing: [data.service.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/data/data.service.ts:141).
- `toCamelDeep()` accepts all body keys, including `organization_id`, `user_id`, role links, status fields, and foreign keys: [data.service.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/data/data.service.ts:823).

Impact: A user can change protected fields that should be server-owned. For example, a row can be reassigned to another organization, or records can be linked to foreign entities that were not validated.

Fix:
- Maintain an allowlist per table for writable fields.
- Strip `id`, `organizationId`, `createdAt`, `updatedAt`, and all server-owned fields from client payloads.
- Use tenant-scoped update conditions, for example `updateMany({ where: { id, organizationId } })`, or composite unique keys where available.

### High: Admin And RBAC Endpoints Only Check Membership, Not Permission

Evidence:
- `RolesController` allows create, update, delete, and permission replacement with only `TenantGuard`: [roles.controller.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/roles/roles.controller.ts:18).
- `UsersController` allows user listing, role assignment, and membership deletion with only `TenantGuard`: [users.controller.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/users/users.controller.ts:16).
- `TenantGuard` verifies authentication and organization membership, but it does not check a permission or role capability: [tenant.guard.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/tenancy/tenant.guard.ts:55).

Impact: Any authenticated member of an organization may be able to modify roles, grant permissions, change users’ roles, or remove users. This defeats the app’s role/permission model.

Fix:
- Add a permission guard, e.g. `@RequirePermission("settings:manage")`.
- Apply it to roles, users, generic data mutations, refunds, payments, and other sensitive routes.
- Keep frontend permission checks as UX only; enforce authorization on the API.

### High: Generic Data API Exposes Security Tables

Evidence:
- The generic table map includes `roles`, `permissions`, and `role_permissions`: [data.service.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/data/data.service.ts:17).
- Generic create/update/delete operations are available for any mapped table via `DataController`: [data.controller.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/data/data.controller.ts:33).

Impact: Even if dedicated role controllers are later protected, the generic data API can remain a bypass for reading or modifying authorization state.

Fix:
- Remove auth/RBAC tables from `TABLE_TO_MODEL`.
- Split generic data into explicit read-only report endpoints and explicit service methods for writes.
- If generic endpoints remain, enforce per-table and per-operation permissions.

### High: Unauthenticated Email And SMS Sending Endpoints

Evidence:
- Nest `/api/email/welcome` has no guard and sends via Resend when `RESEND_API_KEY` exists: [email.controller.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/email/email.controller.ts:20).
- Web `/api/email` has no auth check, accepts arbitrary recipient/form data, and sends using Resend: [route.js](/Users/bidan/Plantation/makazicloud/apps/web/app/api/email/route.js:10).
- Web `/api/sms` has no auth check and forwards arbitrary `phoneNumbers` and `message` to the SMS provider: [route.js](/Users/bidan/Plantation/makazicloud/apps/web/app/api/sms/route.js:4).

Impact: Attackers can abuse application email/SMS credentials for spam, phishing, quota exhaustion, cost abuse, and reputational damage.

Fix:
- Require authenticated sessions and tenant context.
- Enforce permissions such as `tenants:manage` or `messaging:send`.
- Add rate limits, recipient ownership checks, message length limits, attachment type/size limits, and audit logging.

### High: Development Auth Secret Is Accepted In Production

Evidence:
- Session signing falls back to `"dev-auth-secret"` if `AUTH_SECRET` is missing: [session-token.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/auth/session-token.ts:12).

Impact: If production starts without `AUTH_SECRET`, anyone who knows the fallback can forge valid session cookies.

Fix:
- Fail startup if `AUTH_SECRET` is missing or too short outside local development.
- Use at least 32 random bytes.
- Rotate existing sessions after changing the secret.

### Medium: Session Cookies Lack The `Secure` Attribute

Evidence:
- Auth cookies are `HttpOnly`, `SameSite=Lax`, and path-scoped, but not `Secure`: [auth.service.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/auth/auth.service.ts:162).

Impact: In non-local deployments, cookies may be sent over plain HTTP if traffic is downgraded or misrouted.

Fix:
- Add `Secure` in production.
- Consider `SameSite=Strict` for management sessions unless cross-site flows require `Lax`.

### Medium: No Rate Limiting On Login, Signup, Or Messaging

Evidence:
- `AuthController` exposes login/signup directly with no throttling guard: [auth.controller.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/auth/auth.controller.ts:11).
- Email/SMS endpoints also lack throttling.

Impact: Brute-force login attempts, mass signup, email/SMS abuse, and resource exhaustion are easier.

Fix:
- Add Nest throttling or edge-level rate limits.
- Rate-limit by IP, user id, organization id, and destination email/phone where appropriate.
- Add account lockout or progressive delay for repeated login failures.

### Medium: Public Environment Variable Fallbacks For Server Secrets

Evidence:
- Resend server code accepts `NEXT_PUBLIC_RESEND_API_KEY`: [resend.js](/Users/bidan/Plantation/makazicloud/apps/web/app/_lib/email/resend.js:6), [route.js](/Users/bidan/Plantation/makazicloud/apps/web/app/api/email/route.js:4), [invoice route](/Users/bidan/Plantation/makazicloud/apps/web/app/api/tenants/[tenantId]/invoice/route.js:14).
- SMS code accepts `NEXT_PUBLIC_EMALIFY_API_KEY` and `NEXT_PUBLIC_EMALIFY_PARTNER_ID`: [send-sms.js](/Users/bidan/Plantation/makazicloud/apps/web/app/_lib/repositories/send-sms.js:31).

Impact: `NEXT_PUBLIC_*` variables are intended to be exposed to browser bundles in many frontend toolchains. If real provider secrets are placed there, they can leak to clients.

Fix:
- Remove all `NEXT_PUBLIC_*` secret fallbacks.
- Use server-only names, e.g. `RESEND_API_KEY`, `EMALIFY_API_KEY`.
- Rotate any provider keys that were ever configured with a public prefix.

### Medium: User Input Is Injected Into Email HTML Without Escaping

Evidence:
- The Nest welcome email interpolates tenant fields directly into HTML: [email.controller.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/email/email.controller.ts:63).
- The web welcome email also interpolates form fields directly into HTML: [route.js](/Users/bidan/Plantation/makazicloud/apps/web/app/api/email/route.js:56).

Impact: Malicious tenant names or notes can alter the rendered email HTML. This is usually less severe than browser XSS, but it can enable phishing content, tracking markup, broken templates, or mail-client-specific injection issues.

Fix:
- Escape all interpolated values before inserting into HTML.
- Prefer React/email templates or a safe templating library that escapes by default.
- Sanitize or strip HTML from free-text fields.

### Medium: Public Property Listing Defaults To First Active Organization

Evidence:
- If no `x-organization-id` or `x-tenant-slug` is supplied, `resolvePublicTenant()` chooses the first active organization with properties: [properties.service.ts](/Users/bidan/Plantation/makazicloud/apps/api/src/properties/properties.service.ts:17).

Impact: A request without tenant context can expose one organization’s public property data by default. This may be intended for a single-tenant demo, but it is risky in a multi-tenant production deployment.

Fix:
- Require a tenant slug or organization id for public listing APIs.
- Return `400` when tenant context is missing.
- Consider per-property `isPublic` or `publishedAt` fields before exposing listings.

## Additional Hardening

- Add request validation DTOs/Zod schemas on API bodies and query params.
- Add centralized audit logs for role changes, payments, refunds, tenant updates, email sends, SMS sends, and cross-table writes.
- Add security headers at the web/API edge, including CSP, `X-Frame-Options`/`frame-ancestors`, and `Referrer-Policy`.
- Add automated tests for tenant isolation, permission enforcement, and protected-field mass assignment.
- Keep `apps/api/dist`, `apps/web/build`, and `node_modules` out of source control if they are currently tracked.
