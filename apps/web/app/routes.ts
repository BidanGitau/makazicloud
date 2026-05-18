import {
  index,
  layout,
  prefix,
  route,
  type RouteConfig,
} from "@react-router/dev/routes";

export default [
  layout("(public)/layout.js", [
    index("(public)/page.js"),
    route("about", "(public)/about/layout.js", [
      index("(public)/about/page.js"),
    ]),
    route("contact", "(public)/contact/page.js"),
    route("privacy", "(public)/privacy/page.js"),
    route("properties", "(public)/properties/page.js"),
    route("properties/:id", "(public)/properties/[id]/layout.js", [
      index("(public)/properties/[id]/page.js"),
    ]),
    route("terms", "(public)/terms/page.js"),
  ]),

  layout("(auth)/layout.js", [
    route("accept-invite", "(auth)/accept-invite/page.js"),
    route("accept-tenant-invite", "(auth)/accept-tenant-invite/page.js"),
    route("auth/callback", "(auth)/auth/callback/page.js"),
    route("forgot-password", "(auth)/forgot-password/page.js"),
    route("login", "(auth)/management-login/page.js"),
    route("management-signup", "(auth)/management-signup/page.js"),
    route("reset-password", "(auth)/reset-password/page.js"),
    route("verify-email", "(auth)/verify-email/page.js"),
  ]),

  layout("(private)/layout.js", [
    route("arrears", "(private)/arrears/layout.js", [
      index("(private)/arrears/page.js"),
    ]),
    route("dashboard", "(private)/dashboard/layout.js", [
      index("(private)/dashboard/page.js"),
    ]),
    route("maintenance", "(private)/maintenance/page.js"),
    route("payments", "(private)/payments/layout.js", [
      index("(private)/payments/page.js"),
    ]),
    route("propertylisting", "(private)/propertylisting/layout.js", [
      index("(private)/propertylisting/page.js"),
    ]),
    ...prefix("reports", [
      route("financial", "(private)/reports/financial/page.js"),
      route("tenant", "(private)/reports/tenant/page.js"),
    ]),
    route("refunds", "(private)/reports/refunds/page.js"),
    route("settings", "(private)/settings/page.js"),
    route("tenants", "(private)/tenants/layout.js", [
      index("(private)/tenants/page.js"),
    ]),
    route("units", "(private)/units/layout.js", [
      index("(private)/units/page.js"),
    ]),
    route("utility", "(private)/utility/page.js"),
  ]),

  route("tenant-portal", "(tenant)/portal/page.js"),

  route("api/tenants/:tenantId/invoice", "api/tenants/[tenantId]/invoice/route.js"),
  route("api/tenants/:tenantId/statement", "api/tenants/[tenantId]/statement/route.js"),
  route("*", "not-found.js"),
] satisfies RouteConfig;
