"use client";

import { useEffect, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PDFDocument } from "./PDFDocument";
import {
  BRANDING_UPDATED_EVENT,
  fetchOrganizationBranding,
  getStoredBranding,
} from "@/app/_lib/branding";

export default function PDFDownloadLinkClient({
  title,
  data,
  columns,
  metadata,
  fileName,
  className,
  label,
}) {
  const [branding, setBranding] = useState(() => getStoredBranding());

  useEffect(() => {
    let cancelled = false;
    fetchOrganizationBranding()
      .then((nextBranding) => {
        if (!cancelled) setBranding(nextBranding);
      })
      .catch(() => {
        if (!cancelled) setBranding(getStoredBranding());
      });

    const handleBrandingUpdate = (event) => {
      setBranding(event.detail || getStoredBranding());
    };
    window.addEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdate);
    };
  }, []);

  return (
    <PDFDownloadLink
      document={
        <PDFDocument
          title={title}
          data={data}
          columns={columns}
          metadata={metadata}
          branding={branding}
        />
      }
      fileName={fileName}
    >
      {({ loading }) => (
        <button type="button" className={className}>
          {loading ? "Preparing PDF..." : label}
        </button>
      )}
    </PDFDownloadLink>
  );
}
