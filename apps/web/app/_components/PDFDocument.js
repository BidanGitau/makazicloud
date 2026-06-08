"use client";
import React from "react";
import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";


const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111827",
  },

  header: {
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#1d4ed8",
    paddingBottom: 10,
    marginBottom: 14,
  },
  brandLeft: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "62%",
  },
  logo: {
    width: 40,
    height: 40,
    objectFit: "contain",
    marginRight: 9,
  },
  fallbackLogo: {
    width: 40,
    height: 40,
    marginRight: 9,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackLogoText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  brandName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f172a",
  },
  brandSub: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  generated: {
    fontSize: 8,
    color: "#64748b",
    textAlign: "right",
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 9,
    color: "#64748b",
  },

  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: "#e7e5e4",
    backgroundColor: "#fafaf9",
    marginBottom: 14,
  },

  metadataItem: {
    width: "25%",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#e7e5e4",
    borderBottomWidth: 1,
    borderBottomColor: "#e7e5e4",
  },

  metadataLabel: {
    fontSize: 6.5,
    color: "#64748b",
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  metadataValue: {
    fontSize: 8.5,
    color: "#111827",
    marginTop: 2,
  },

  table: {
    borderWidth: 1,
    borderColor: "#d6d3d1",
  },

  tableRow: {
    flexDirection: "row",
    minHeight: 24,
  },

  tableRowAlt: {
    flexDirection: "row",
    minHeight: 24,
    backgroundColor: "#fafaf9",
  },

  totalRow: {
    flexDirection: "row",
    minHeight: 25,
    backgroundColor: "#eff6ff",
    borderTopWidth: 1.5,
    borderTopColor: "#1d4ed8",
  },

  tableHeader: {
    backgroundColor: "#1d4ed8",
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#ffffff",
    textTransform: "uppercase",
    borderRightWidth: 1,
    borderRightColor: "#3b82f6",
  },

  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 8,
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#e7e5e4",
    borderRightWidth: 1,
    borderRightColor: "#e7e5e4",
  },

  numberCell: {
    textAlign: "right",
  },

  totalCell: {
    fontWeight: "bold",
    color: "#0f172a",
  },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 7,
    borderTopWidth: 1,
    borderTopColor: "#e7e5e4",
    paddingTop: 7,
  },

  noData: {
    textAlign: "center",
    color: "#64748b",
    fontSize: 10,
    marginTop: 20,
  },
});

export const PDFDocument = ({
  title,
  subtitle,
  data = [],
  columns = [],
  metadata = {},
  showFooter = true,
  branding,
}) => {
  const brandName =
    branding?.displayName ||
    branding?.institutionName ||
    branding?.name ||
    "MakaziCloud Property Management";
  const logoDataUrl = branding?.logoDataUrl || null;
  const formatLabel = (label) => {
    if (!label) return "";
    return String(label)
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatValue = (value, column, row) => {
    if (column.render) {
      return String(column.render(value, row) ?? "-");
    }
    if (column.type === "currency") {
      return `KSh ${Number(value || 0).toLocaleString("en-KE")}`;
    }
    if (column.type === "date") {
      if (!value) return "-";
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-KE");
    }
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  };

  const formatMetadataValue = (value) => {
    if (value === null || value === undefined) return "-";
    if (value instanceof Date) return value.toLocaleDateString();
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") {
      try {
        const json = JSON.stringify(value);
        return json === "{}" ? String(value) : json;
      } catch {
        return String(value);
      }
    }
    return value;
  };

  const normalizeMetadata = (input) => {
    if (!input || typeof input !== "object") return [];
    const rows = [];
    Object.entries(input).forEach(([key, value]) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const entries = Object.entries(value);
        if (entries.length > 0) {
          entries.forEach(([subKey, subValue]) => {
            rows.push({
              label: `${formatLabel(key)} - ${formatLabel(subKey)}`,
              value: subValue,
            });
          });
          return;
        }
      }
      rows.push({ label: formatLabel(key), value });
    });
    return rows;
  };

  const metadataRows = normalizeMetadata(metadata);
  const isWideReport = columns.length > 7;
  const pageOrientation = isWideReport ? "landscape" : "portrait";
  const metadataWidth = isWideReport ? "20%" : "25%";
  const formatColumnLabel = (col) =>
    col.label || col.header || col.name || formatLabel(col.key);
  const isNumericColumn = (col) =>
    col.type === "currency" ||
    col.type === "number" ||
    /amount|total|rent|paid|due|collected|income|cost|outstanding|units|tenants|advance/i.test(
      String(col.key || col.header || col.label || ""),
    );
  const isTotalRow = (row) =>
    Object.values(row || {}).some(
      (value) => String(value || "").toUpperCase() === "TOTAL",
    );
  const cellStyleFor = (row, col) =>
    [
      styles.tableCell,
      { width: col.width || `${100 / columns.length}%` },
      isNumericColumn(col) ? styles.numberCell : undefined,
      isTotalRow(row) ? styles.totalCell : undefined,
    ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" orientation={pageOrientation} style={styles.page}>

        {title && (
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandLeft}>
                {logoDataUrl ? (
                  <Image src={logoDataUrl} style={styles.logo} />
                ) : (
                  <View style={styles.fallbackLogo}>
                    <Text style={styles.fallbackLogoText}>M</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.brandName}>{brandName}</Text>
                  <Text style={styles.brandSub}>Powered by MakaziCloud</Text>
                </View>
              </View>
              <Text style={styles.generated}>
                Generated {new Date().toLocaleDateString("en-KE")}
              </Text>
            </View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        )}


        {metadataRows.length > 0 && (
          <View style={styles.metadata}>
            {metadataRows.map((row, index) => (
              <View
                key={`${row.label}-${index}`}
                style={[styles.metadataItem, { width: metadataWidth }]}
              >
                <Text style={styles.metadataLabel}>{row.label}</Text>
                <Text style={styles.metadataValue}>
                  {String(formatMetadataValue(row.value))}
                </Text>
              </View>
            ))}
          </View>
        )}


        {columns.length > 0 && (
          <View style={styles.table}>

            <View style={styles.tableRow}>
              {columns.map((col) => (
                <Text
                  key={col.key}
                  style={[
                    styles.tableHeader,
                    { width: col.width || `${100 / columns.length}%` },
                  ]}
                >
                  {formatColumnLabel(col)}
                </Text>
              ))}
            </View>


            {data.map((row, index) => (
              <View
                key={index}
                style={
                  isTotalRow(row)
                    ? styles.totalRow
                    : index % 2 === 0
                      ? styles.tableRow
                      : styles.tableRowAlt
                }
              >
                {columns.map((col) => (
                  <Text
                    key={col.key}
                    style={cellStyleFor(row, col)}
                  >
                    {formatValue(row[col.key], col, row)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}


        {data.length === 0 && columns.length > 0 && (
          <Text style={styles.noData}>No data available</Text>
        )}


        {showFooter && (
          <Text style={styles.footer}>
            Generated on {new Date().toLocaleDateString()}
          </Text>
        )}
      </Page>
    </Document>
  );
};

export default PDFDocument;
