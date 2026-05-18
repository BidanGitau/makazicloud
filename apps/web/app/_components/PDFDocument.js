"use client";
import React from "react";
import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Simple, clean PDF styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
    fontSize: 12,
  },

  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: 42,
    height: 42,
    objectFit: "contain",
    marginRight: 10,
  },
  fallbackLogo: {
    width: 42,
    height: 42,
    marginRight: 10,
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
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  brandSub: {
    fontSize: 8,
    color: "#6B7280",
    marginTop: 2,
  },

  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },

  metadata: {
    marginBottom: 20,
    backgroundColor: "#F9FAFB",
    padding: 15,
    borderRadius: 8,
  },

  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  metadataLabel: {
    fontSize: 10,
    color: "#374151",
    fontWeight: "bold",
  },

  metadataValue: {
    fontSize: 10,
    color: "#6B7280",
  },

  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  tableRow: {
    flexDirection: "row",
  },

  tableHeader: {
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    padding: 8,
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },

  tableCell: {
    padding: 8,
    fontSize: 10,
    color: "#1F2937",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },

  noData: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 12,
    marginTop: 20,
    fontStyle: "italic",
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        {title && (
          <View style={styles.header}>
            <View style={styles.brandRow}>
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
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        )}

        {/* Metadata */}
        {metadataRows.length > 0 && (
          <View style={styles.metadata}>
            {metadataRows.map((row, index) => (
              <View key={`${row.label}-${index}`} style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{row.label}:</Text>
                <Text style={styles.metadataValue}>
                  {String(formatMetadataValue(row.value))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Table */}
        {columns.length > 0 && (
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableRow}>
              {columns.map((col) => (
                <Text
                  key={col.key}
                  style={[
                    styles.tableHeader,
                    { width: col.width || `${100 / columns.length}%` },
                  ]}
                >
                  {col.label || col.header || col.name || col.key}
                </Text>
              ))}
            </View>

            {/* Table Data */}
            {data.map((row, index) => (
              <View key={index} style={styles.tableRow}>
                {columns.map((col) => (
                  <Text
                    key={col.key}
                    style={[
                      styles.tableCell,
                      { width: col.width || `${100 / columns.length}%` },
                    ]}
                  >
                    {formatValue(row[col.key], col, row)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* No Data Message */}
        {data.length === 0 && columns.length > 0 && (
          <Text style={styles.noData}>No data available</Text>
        )}

        {/* Footer */}
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
