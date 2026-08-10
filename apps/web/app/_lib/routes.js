import {
  Home,
  Building,
  Grid,
  UserCheck,
  CircleDollarSign,
  FileText,
  Wrench,
  Zap,
  Settings,
  Users,
  ShieldCheck,
  KeyRound,
  CreditCard,
  Smartphone,
  Undo2,
  WalletCards,
  MessageCirclePlus,
  ClipboardList,
} from "lucide-react";
import { SUBSCRIPTION_PLANS } from "./subscriptionPlans";


export const ROUTES = {

  LOGIN: "/login",
  SIGNUP: "/management-signup",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_EMAIL: "/verify-email",
  AUTH_CALLBACK: "/auth/callback",


  DASHBOARD: "/dashboard",
  PROPERTIES: "/propertylisting",
  UNITS: "/units",
  TENANTS: "/tenants",


  ARREARS: "/arrears",
  REFUNDS: "/refunds",
  REPORTS: "/reports/tenant",
  OWNER_SETTLEMENTS: "/owner-settlements",


  UTILITIES: "/utility",
  MAINTENANCE: "/maintenance",


  SETTINGS: "/settings",
  AUDIT_LOGS: "/audit-logs",
};


export const NAV_CATEGORIES = {
  main: "Main",
  finance: "Finance",
  operations: "Operations",
};


export const NAV_ITEMS = [
  {
    href: ROUTES.DASHBOARD,
    icon: Home,
    label: "Dashboard",
    category: "main",
    permission: "dashboard:view",
    plans: ["free", "growth", "scale"],
    addon: "dashboard",
  },
  {
    href: ROUTES.PROPERTIES,
    icon: Building,
    label: "Properties",
    category: "main",
    permission: "properties:view",
    plans: ["free", "growth", "scale"],
    addon: "properties",
  },
  {
    href: ROUTES.UNITS,
    icon: Grid,
    label: "Units",
    category: "main",
    permission: "units:view",
    plans: ["free", "growth", "scale"],
    addon: "units",
  },
  {
    href: ROUTES.TENANTS,
    icon: UserCheck,
    label: "Tenants",
    category: "main",
    permission: "tenants:view",
    plans: ["free", "growth", "scale"],
    addon: "tenants",
  },
  {
    href: ROUTES.ARREARS,
    icon: CircleDollarSign,
    label: "Arrears",
    category: "finance",
    permission: "arrears:view",
    plans: ["free", "growth", "scale"],
    addon: "arrears",
  },
  {
    href: ROUTES.REFUNDS,
    icon: Undo2,
    label: "Refunds",
    category: "finance",
    permission: "arrears:view",
    plans: ["free", "growth", "scale"],
    addon: "refunds",
  },
  {
    href: ROUTES.REPORTS,
    activeBase: "/reports",
    icon: FileText,
    label: "Reports",
    category: "finance",
    permission: "reports:view",
    plans: ["free", "growth", "scale"],
    addon: "reports",
  },
  {
    href: ROUTES.OWNER_SETTLEMENTS,
    icon: WalletCards,
    label: "Owner Disbursements",
    category: "finance",
    permission: "reports:view",
    plans: ["free", "growth", "scale"],
    addon: "owner_settlements",
  },
  {
    href: ROUTES.UTILITIES,
    icon: Zap,
    label: "Utilities",
    category: "operations",
    permission: "utilities:view",
    plans: ["free", "growth", "scale"],
    addon: "utilities",
  },
  {
    href: ROUTES.MAINTENANCE,
    icon: Wrench,
    label: "Maintenance",
    category: "operations",
    permission: "maintenance:view",
    plans: ["free", "growth", "scale"],
    addon: "maintenance",
  },
];


export const FOOTER_NAV_ITEMS = [
  {
    href: ROUTES.AUDIT_LOGS,
    icon: ClipboardList,
    label: "Audit Logs",
    permission: "settings:manage",
    ownerOnly: true,
    plans: ["free", "growth", "scale"],
  },
  {
    href: ROUTES.SETTINGS,
    icon: Settings,
    label: "Settings",
    permission: "settings:view",
    plans: ["free", "growth", "scale"],
  },
];


export const SETTINGS_TABS = [
  { id: "profile", label: "Profile", icon: UserCheck, permission: null },
  {
    id: "team",
    label: "Team Members",
    icon: Users,
    permission: "users:view",
  },
  {
    id: "roles",
    label: "Roles & Permissions",
    icon: ShieldCheck,
    permission: "roles:view",
    ownerOnly: true,
  },
  {
    id: "account",
    label: "Account",
    icon: KeyRound,
    permission: null,
  },
  { id: "subscription", label: "Subscription", icon: CreditCard, permission: null },
  {
    id: "sms-balance",
    label: "SMS Balance",
    icon: MessageCirclePlus,
    permission: "settings:manage",
    addon: "sms",
  },
];

export const ROUTE_SUBSCRIPTION_PLANS = SUBSCRIPTION_PLANS.reduce(
  (acc, plan) => {
    plan.routes.forEach((route) => {
      if (!acc[route]) acc[route] = [];
      acc[route].push(plan.id);
    });
    return acc;
  },
  {},
);


export const getNavItemsByCategory = (items = NAV_ITEMS) => {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
};


export const filterNavItemsByPermissions = (items, userPermissions = []) => {
  const permissionSet = new Set(userPermissions || []);
  return items.filter((item) => {
    if (!item.permission) return true;
    return permissionSet.has(item.permission);
  });
};

export const isRouteAllowedForPlan = (item, planId = "free") => {
  const plan = SUBSCRIPTION_PLANS.find((candidate) => candidate.id === planId);
  if (plan?.routes?.includes("*")) return true;
  if (!item?.plans?.length) return true;
  return item.plans.includes(planId);
};

export const isRouteAllowedForAddons = (item, entitlements = null) => {
  if (!item?.addon) return true;
  const flags = entitlements?.flags || {};
  if (Object.prototype.hasOwnProperty.call(flags, item.addon)) {
    return flags[item.addon] === true;
  }
  const addons = entitlements?.addons;
  if (Array.isArray(addons)) return addons.includes(item.addon);
  return true;
};

export const filterNavItemsByAccess = (
  items,
  userPermissions = [],
  planId = "free",
  entitlements = null,
  user = null,
) => {
  return filterNavItemsByPermissions(items, userPermissions).filter((item) =>
    (!item.ownerOnly || user?.role === "OWNER") &&
    isRouteAllowedForPlan(item, planId) &&
    isRouteAllowedForAddons(item, entitlements),
  );
};

export const getFirstAllowedRoute = (
  userPermissions = [],
  planId = "free",
  entitlements = null,
  user = null,
) => {
  const allowedMainItem = filterNavItemsByAccess(
    [...NAV_ITEMS, ...FOOTER_NAV_ITEMS],
    userPermissions,
    planId,
    entitlements,
    user,
  )[0];
  return allowedMainItem?.href || ROUTES.SETTINGS;
};

export const getRequiredPermissionForPath = (pathname = "") => {
  const allItems = [...NAV_ITEMS, ...FOOTER_NAV_ITEMS].sort(
    (a, b) => b.href.length - a.href.length,
  );
  const match = allItems.find((item) => isRouteActive(pathname, item));
  return match?.permission || null;
};

export const getRequiredPlanForPath = (pathname = "") => {
  const allItems = [...NAV_ITEMS, ...FOOTER_NAV_ITEMS].sort(
    (a, b) => b.href.length - a.href.length,
  );
  const match = allItems.find((item) => isRouteActive(pathname, item));
  return match?.plans || null;
};

export const getRequiredAddonForPath = (pathname = "") => {
  const allItems = [...NAV_ITEMS, ...FOOTER_NAV_ITEMS].sort(
    (a, b) => b.href.length - a.href.length,
  );
  const match = allItems.find((item) => isRouteActive(pathname, item));
  return match?.addon || null;
};


export const isRouteActive = (pathname, hrefOrItem) => {
  const href = typeof hrefOrItem === "string" ? hrefOrItem : hrefOrItem?.href;
  const activeBase =
    typeof hrefOrItem === "string" ? null : hrefOrItem?.activeBase;
  const matchPath = activeBase || href;

  if (href === ROUTES.DASHBOARD) {
    return pathname === href;
  }
  return pathname === matchPath || pathname.startsWith(`${matchPath}/`);
};


export const getBreadcrumbs = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = [{ label: "Home", href: ROUTES.DASHBOARD }];

  let currentPath = "";
  segments.forEach((segment) => {
    currentPath += `/${segment}`;


    const navItem = [...NAV_ITEMS, ...FOOTER_NAV_ITEMS].find(
      (item) => item.href === currentPath,
    );

    if (navItem) {
      breadcrumbs.push({ label: navItem.label, href: navItem.href });
    } else {

      const label =
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
      breadcrumbs.push({ label, href: currentPath });
    }
  });

  return breadcrumbs;
};


export const PUBLIC_ROUTES = [
  "/properties",
  ROUTES.LOGIN,
  ROUTES.SIGNUP,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.VERIFY_EMAIL,
  ROUTES.AUTH_CALLBACK,
];


export const isPublicRoute = (pathname) => {

  if (pathname === "/") return true;


  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
};


export const DEFAULT_AUTH_REDIRECT = ROUTES.DASHBOARD;


export const DEFAULT_UNAUTH_REDIRECT = ROUTES.LOGIN;
