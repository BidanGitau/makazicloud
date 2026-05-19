import { apiFetch } from "./api/client";

const BRANDING_STORAGE_KEY = "makazicloud:branding";
export const BRANDING_UPDATED_EVENT = "makazicloud:branding-updated";

export const DEFAULT_BRANDING = Object.freeze({
  name: "MakaziCloud Property Management",
  institutionName: "MakaziCloud Property Management",
  displayName: "MakaziCloud Property Management",
  logoDataUrl: null,
  hasCustomLogo: false,
});

export function normalizeBranding(branding = {}) {

  const name = String(branding.name || DEFAULT_BRANDING.name).trim();
  const institutionName = String(
    
    branding.institutionName || branding.institution_name || name,
  ).trim();
  const logoDataUrl = branding.logoDataUrl || branding.logo_data_url || null;
  return {
    name,
    institutionName,
    displayName: institutionName || name || DEFAULT_BRANDING.displayName,
    logoDataUrl,
    hasCustomLogo: Boolean(logoDataUrl),
  };
}

export function getStoredBranding() {
  if (typeof window === "undefined") return DEFAULT_BRANDING;
  try {
    const raw = window.localStorage.getItem(BRANDING_STORAGE_KEY);
    return raw ? normalizeBranding(JSON.parse(raw)) : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function setStoredBranding(branding) {
  if (typeof window === "undefined") return normalizeBranding(branding);
  const normalized = normalizeBranding(branding);
  window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent(BRANDING_UPDATED_EVENT, { detail: normalized }),
  );
  return normalized;
}

export function clearStoredBranding() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(BRANDING_STORAGE_KEY);
}

export async function fetchOrganizationBranding() {
  const branding = await apiFetch("/organization/branding");
  return setStoredBranding(branding);
}

export async function saveOrganizationBranding(payload) {
  const branding = await apiFetch("/organization/branding", {
    method: "PATCH",
    body: payload,
  });
  return setStoredBranding(branding);
}
