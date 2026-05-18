"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { PDFDocument } from "./PDFDocument";
import { getStoredBranding } from "@/app/_lib/branding";

export default function PDFDownloadLinkClient({
  title,
  data,
  columns,
  metadata,
  fileName,
  className,
  label,
}) {
  const branding = getStoredBranding();
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
