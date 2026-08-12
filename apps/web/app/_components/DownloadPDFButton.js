"use client";

import { Component, lazy, Suspense, useState } from "react";

const LazyPDFDownloadLink = lazy(() => import("./PDFDownloadLinkClient"));
const PDF_CHUNK_RELOAD_KEY = "makazicloud:pdf-chunk-reload";

const defaultButtonClass =
  "bg-blue-700 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800 disabled:opacity-50";

const defaultSelectClass =
  "border border-stone-300 bg-white px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-black/65 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700";

const ensureExtension = (fileName = "report", extension) => {
  if (!fileName) return `report.${extension}`;
  const cleaned = String(fileName).replace(/\.(pdf|csv|xlsx)$/i, "");
  return `${cleaned}.${extension}`;
};

const formatColumnValue = (row, column) => {
  const rawValue = row?.[column.key];

  if (typeof column.excelRender === "function") {
    return column.excelRender(rawValue, row);
  }

  if (column.type === "currency") {
    return Number(rawValue || 0);
  }

  if (column.type === "date") {
    if (!rawValue) return "";
    const d = new Date(rawValue);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-KE");
  }

  if (rawValue === null || rawValue === undefined) return "";
  if (typeof rawValue === "object") return JSON.stringify(rawValue);

  return rawValue;
};

const escapeCsv = (value) => {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const flattenMetadata = (metadata = {}) => {
  const rows = [];

  Object.entries(metadata || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        rows.push({
          label: `${key} - ${subKey}`,
          value: subValue,
        });
      });
      return;
    }

    rows.push({ label: key, value });
  });

  return rows;
};

const downloadExcelCompatibleCsv = ({
  fileName,
  title,
  data = [],
  columns = [],
  metadata = {},
}) => {
  const safeColumns =
    columns.length > 0
      ? columns
      : Object.keys(data[0] || {}).map((key) => ({
          key,
          label: key.replace(/_/g, " "),
        }));

  const lines = [];

  if (title) {
    lines.push(escapeCsv(title));
    lines.push("");
  }

  const metadataEntries = flattenMetadata(metadata);
  if (metadataEntries.length > 0) {
    lines.push("Field,Value");
    metadataEntries.forEach(({ label, value }) => {
      const formattedLabel = String(label).replace(/_/g, " ");
      lines.push(`${escapeCsv(formattedLabel)},${escapeCsv(value)}`);
    });
    lines.push("");
  }

  lines.push(
    safeColumns
      .map((col) => escapeCsv(col.label || col.header || col.name || col.key))
      .join(","),
  );

  data.forEach((row) => {
    const values = safeColumns.map((col) =>
      escapeCsv(formatColumnValue(row, col)),
    );
    lines.push(values.join(","));
  });

  const csv = `\uFEFF${lines.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ensureExtension(fileName, "csv");
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const isChunkLoadError = (error) => {
  const message = String(error?.message || error || "");
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("Expected a JavaScript-or-Wasm module script")
  );
};

class PDFChunkBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (typeof window === "undefined" || !isChunkLoadError(error)) return;
    if (window.sessionStorage.getItem(PDF_CHUNK_RELOAD_KEY) === "1") return;
    window.sessionStorage.setItem(PDF_CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <button
        type="button"
        className={this.props.className}
        onClick={() => {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(PDF_CHUNK_RELOAD_KEY);
            window.location.reload();
          }
        }}
      >
        Reload PDF
      </button>
    );
  }
}

export const DownloadReportButton = ({
  format = "pdf",
  fileName,
  title,
  data,
  columns,
  metadata,
  sections,
  className = defaultButtonClass,
  label,
}) => {
  const isExcel = format === "excel";

  if (isExcel) {
    return (
      <button
        type="button"
        className={className}
        onClick={() =>
          downloadExcelCompatibleCsv({ fileName, title, data, columns, metadata })
        }
      >
        {label || "Download Excel"}
      </button>
    );
  }

  return (
    <PDFChunkBoundary className={className}>
      <Suspense
        fallback={
          <button type="button" className={className} disabled>
            Loading PDF...
          </button>
        }
      >
        <LazyPDFDownloadLink
          title={title}
          data={data}
          columns={columns}
          metadata={metadata}
          sections={sections}
          fileName={ensureExtension(fileName, "pdf")}
          className={className}
          label={label || `Download ${title || "PDF"}`}
        />
      </Suspense>
    </PDFChunkBoundary>
  );
};

export const DownloadPDFButton = (props) => (
  <DownloadFormatDropdown initialFormat="pdf" {...props} />
);

export const DownloadExcelButton = (props) => (
  <DownloadReportButton format="excel" {...props} />
);

export const DownloadFormatDropdown = ({
  initialFormat = "pdf",
  fileName,
  title,
  data,
  columns,
  metadata,
  sections,
  className = defaultButtonClass,
  label = "Download",
  selectClassName = defaultSelectClass,
  wrapperClassName = "inline-flex flex-wrap items-center gap-2",
}) => {
  const [selectedFormat, setSelectedFormat] = useState(initialFormat);

  return (
    <div className={wrapperClassName}>
      <select
        value={selectedFormat}
        onChange={(e) => setSelectedFormat(e.target.value)}
        className={selectClassName}
        aria-label="Select download format"
      >
        <option value="pdf">PDF</option>
        <option value="excel">Excel</option>
      </select>

      {selectedFormat === "excel" ? (
        <button
          type="button"
          className={className}
          onClick={() =>
            downloadExcelCompatibleCsv({ fileName, title, data, columns, metadata })
          }
        >
          {label}
        </button>
      ) : (
        <PDFChunkBoundary className={className}>
          <Suspense
            fallback={
              <button type="button" className={className} disabled>
                Loading PDF...
              </button>
            }
          >
            <LazyPDFDownloadLink
              title={title}
              data={data}
              columns={columns}
              metadata={metadata}
              sections={sections}
              fileName={ensureExtension(fileName, "pdf")}
              className={className}
              label={label}
            />
          </Suspense>
        </PDFChunkBoundary>
      )}
    </div>
  );
};

export default DownloadFormatDropdown;
