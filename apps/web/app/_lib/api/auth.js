


import { apiFetch, ApiError } from "./client";
import { clearStoredBranding, setStoredBranding } from "../branding";
import { ACCOUNT_TYPE } from "../account-types";

const USER_STORAGE_KEY = "makazicloud:user";
const ORG_STORAGE_KEY = "organizationId";

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_STORAGE_KEY);
}

function setStoredOrg(orgId) {
  if (typeof window === "undefined") return;
  if (orgId) window.localStorage.setItem(ORG_STORAGE_KEY, orgId);
  else window.localStorage.removeItem(ORG_STORAGE_KEY);
}


export function toAuthUser(u) {
  if (!u) return null;
  const fullName = u.fullName || u.user_metadata?.full_name || "";
  const [inferredFirst = "", ...rest] = fullName.trim().split(" ");
  const inferredLast = rest.join(" ");
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName || u.user_metadata?.firstName || inferredFirst,
    lastName: u.lastName || u.user_metadata?.lastName || inferredLast,
    fullName,
    role: u.role || u.user_metadata?.role || "VIEWER",
    roleId: u.roleId || u.user_metadata?.roleId || null,
    roleName: u.roleName || u.user_metadata?.roleName || null,
    accountType:
      u.accountType || u.user_metadata?.accountType || ACCOUNT_TYPE.STAFF,
    tenantId: u.tenantId || u.user_metadata?.tenantId || null,
    organizationId: u.organizationId || null,
    organization: u.organization || null,
    permissions: Array.isArray(u.permissions) ? u.permissions : [],
    subscription: u.subscription || null,
    emailVerified:
      u.emailVerified ?? (u.email_confirmed_at != null ? true : false),
    needsPasswordSetup:
      u.needsPasswordSetup ?? u.user_metadata?.needs_password_setup === true,
  };
}

function storeSession(payloadUser) {
  const user = toAuthUser(payloadUser);
  setStoredUser(user);
  if (payloadUser?.organization) setStoredBranding(payloadUser.organization);
  if (payloadUser?.organizationId) setStoredOrg(payloadUser.organizationId);
  return user;
}

export async function login({ email, password }) {
  const payload = await apiFetch("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return storeSession(payload.user);
}

export async function signup({
  email,
  password,
  fullName,
  organizationName,
  organizationSlug,
}) {
  const payload = await apiFetch("/auth/signup", {
    method: "POST",
    body: { email, password, name: fullName, organizationName, organizationSlug },
  });
  return storeSession(payload.user);
}

export async function logout() {
  try {
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {

  }
  setStoredUser(null);
  setStoredOrg(null);
  clearStoredBranding();
}


export async function fetchCurrentUser() {
  try {
    const payload = await apiFetch("/auth/me");
    if (!payload?.user) {
      setStoredUser(null);
      setStoredOrg(null);
      clearStoredBranding();
      return null;
    }
    return storeSession(payload.user);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      setStoredUser(null);
      setStoredOrg(null);
      clearStoredBranding();
      return null;
    }
    return getStoredUser();
  }
}


export function patchStoredUserMetadata(updates = {}) {
  const stored = getStoredUser();
  if (!stored) return null;
  const next = { ...stored, ...updates };
  setStoredUser(next);
  return next;
}
