"use client";

import { useEffect, useState } from "react";
import Link from "@/app/_components/AppLink";
import { useAuth } from "@/app/_context/AuthContext";
import {
  BRANDING_UPDATED_EVENT,
  DEFAULT_BRANDING,
  fetchOrganizationBranding,
  getStoredBranding,
} from "@/app/_lib/branding";
import { ROUTES } from "@/app/_lib/routes";

function Logo({ compact = false }) {
  const { user } = useAuth();
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const logoHref = user ? ROUTES.DASHBOARD : "/";
  const brandName = user
    ? branding.displayName || branding.institutionName || branding.name
    : DEFAULT_BRANDING.displayName;
  const logoDataUrl = user ? branding.logoDataUrl : null;

  useEffect(() => {
    setBranding(getStoredBranding());
    if (user) {
      fetchOrganizationBranding()
        .then(setBranding)
        .catch(() => setBranding(getStoredBranding()));
    }

    const handleBrandingUpdate = (event) => {
      setBranding(event.detail || getStoredBranding());
    };
    const handleStorage = (event) => {
      if (event.key === "makazicloud:branding") {
        setBranding(getStoredBranding());
      }
    };

    window.addEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, [user]);

  return (
    <Link
      href={logoHref}
      className={`group flex min-w-0 items-center gap-3 transition-colors ${
        compact ? "justify-center" : ""
      }`}
      title={brandName}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden">
        <img
          src={logoDataUrl || "/logo.png"}
          alt={`${brandName} logo`}
          className="h-full w-full object-contain"
        />
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span
            className="block truncate text-base font-black uppercase tracking-tight text-black sm:text-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {brandName || "MakaziCloud"}
          </span>
          <span className="block truncate text-[8px] font-bold uppercase tracking-[0.22em] text-black/40">
            Property OS
          </span>
        </span>
      )}
    </Link>
  );
}

export default Logo;
