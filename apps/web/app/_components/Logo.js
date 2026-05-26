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

const LOGO_SIZES = {
  default: {
    mark: "h-10 w-10",
    text: "text-base sm:text-lg",
    tag: "text-[8px]",
    gap: "gap-3",
  },
  large: {
    mark: "h-20 w-20 sm:h-24 sm:w-24",
    text: "text-3xl sm:text-4xl",
    tag: "text-[11px] sm:text-xs",
    gap: "gap-5",
  },
};

function Logo({
  compact = false,
  size = "default",
  className = "",
  markClassName = "",
  imageClassName = "",
}) {
  const { user } = useAuth();
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const logoSize = LOGO_SIZES[size] || LOGO_SIZES.default;
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
      className={`group flex min-w-0 items-center ${logoSize.gap} transition-colors ${
        compact ? "justify-center" : ""
      } ${className}`}
      title={brandName}
    >
      <span
        className={`app-logo-mark flex ${logoSize.mark} shrink-0 items-center justify-center overflow-visible ${markClassName}`}
      >
        <img
          src={logoDataUrl || "/logo.png"}
          alt={`${brandName} logo`}
          className={`app-logo-image h-full w-full object-contain ${imageClassName}`}
        />
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span
            className={`block truncate ${logoSize.text} font-black uppercase tracking-tight text-black`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {brandName || "MakaziCloud"}
          </span>
          <span className={`block truncate ${logoSize.tag} font-bold uppercase tracking-[0.22em] text-black/40`}>
            Property OS
          </span>
        </span>
      )}
    </Link>
  );
}

export default Logo;
