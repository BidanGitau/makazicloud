import React from "react";
import { Resend } from "resend";
import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

import { loadTenantPDFContext } from "../_pdf-context";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const emailFrom = process.env.EMAIL_FROM || "MakaziCloud <noreply@contact.makazicloud.com>";

export const runtime = "nodejs";

const json = (body, init = {}) =>
  Response.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

// ─── Helpers (no locale calls inside PDF renderer) ────────────────────────────
const fmt = (n) => `KSh ${Number(n || 0).toLocaleString()}`;

const fmtDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB");
};

const fmtMonth = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:        { padding: 30, fontSize: 10, color: "#111827", fontFamily: "Helvetica" },

  // Header
  headerRow:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  toBlock:     { maxWidth: "55%" },
  fromBlock:   { maxWidth: "42%", alignItems: "flex-end" },
  stmtTitle:   { fontSize: 20, fontWeight: 700, color: "#1d4ed8", marginBottom: 6 },
  tenantName:  { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  companyName: { fontSize: 11, fontWeight: 700, textAlign: "right", marginBottom: 2 },
  logo:        { width: 44, height: 44, objectFit: "contain", marginBottom: 5 },
  fallbackLogo:{ width: 44, height: 44, backgroundColor: "#1d4ed8", alignItems: "center",
                 justifyContent: "center", marginBottom: 5 },
  fallbackLogoText:{ color: "white", fontSize: 16, fontWeight: 700 },
  muted:       { color: "#6b7280", fontSize: 9, marginBottom: 1 },
  mutedRight:  { color: "#6b7280", fontSize: 9, marginBottom: 1, textAlign: "right" },

  // Section title bar
  sectionBar:  { fontSize: 10, fontWeight: 700, backgroundColor: "#1d4ed8", color: "white",
                 padding: 6, marginTop: 18, marginBottom: 0 },

  // Table
  tableHead:   { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 5, paddingHorizontal: 6 },
  tableRow:    { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6,
                 borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6,
                 borderBottomWidth: 1, borderBottomColor: "#f3f4f6", backgroundColor: "#fafafa" },
  tableFooter: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6,
                 borderTopWidth: 1.5, borderTopColor: "#6b7280", backgroundColor: "#f3f4f6" },
  bold:        { fontWeight: 700 },

  // Statement table columns: Period | Invoice | Money In | Balance
  cPeriod: { width: "28%", fontSize: 9 },
  cInv:    { width: "24%", fontSize: 9, textAlign: "right" },
  cIn:     { width: "24%", fontSize: 9, textAlign: "right" },
  cBal:    { width: "24%", fontSize: 9, textAlign: "right" },

  // Summary block
  summaryBlock:  { marginTop: 20, alignItems: "flex-end" },
  sumRow:        { flexDirection: "row", paddingVertical: 3, width: 280 },
  sumLabel:      { width: 160, fontSize: 9 },
  sumValue:      { width: 120, fontSize: 9, textAlign: "right" },
  sumTotalRow:   { flexDirection: "row", paddingVertical: 5, width: 280,
                   borderTopWidth: 1, borderTopColor: "#d1d5db", marginTop: 4 },
  sumTotalLabel: { width: 160, fontSize: 11, fontWeight: 700 },
  sumTotalValue: { width: 120, fontSize: 11, fontWeight: 700, textAlign: "right" },

  red:   { color: "#dc2626" },
  green: { color: "#16a34a" },

  footer: { marginTop: 18, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

// ─── PDF Component ────────────────────────────────────────────────────────────
function StatementPDF({
  tenantName, tenantEmail, propertyName, blockName, unitNumber, leaseStart,
  rows, summary, generatedDate, branding,
}) {
  const brandName = branding?.displayName || "MakaziCloud Property Management";
  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerRow}>
          <View style={s.toBlock}>
            <Text style={s.stmtTitle}>Statement of Account</Text>
            <Text style={s.tenantName}>{tenantName}</Text>
            {tenantEmail ? <Text style={s.muted}>{tenantEmail}</Text> : null}
            <Text style={s.muted}>
              {propertyName}
              {blockName ? ` — Block ${blockName}` : ""}
              {unitNumber ? ` — Unit ${unitNumber}` : ""}
            </Text>
            {leaseStart ? <Text style={s.muted}>Lease start: {leaseStart}</Text> : null}
          </View>
          <View style={s.fromBlock}>
            {branding?.logoDataUrl ? (
              <Image src={branding.logoDataUrl} style={s.logo} />
            ) : (
              <View style={s.fallbackLogo}>
                <Text style={s.fallbackLogoText}>M</Text>
              </View>
            )}
            <Text style={s.companyName}>{brandName}</Text>
            <Text style={s.mutedRight}>Nairobi, Kenya</Text>
            <Text style={s.mutedRight}>Powered by MakaziCloud</Text>
            <Text style={s.mutedRight}>Generated: {generatedDate}</Text>
          </View>
        </View>

        {/* ── Statement table ── */}
        <Text style={s.sectionBar}>Account Statement</Text>
        <View style={s.tableHead}>
          <Text style={[s.cPeriod, s.bold]}>Period</Text>
          <Text style={[s.cInv,    s.bold]}>Invoice</Text>
          <Text style={[s.cIn,     s.bold]}>Money In</Text>
          <Text style={[s.cBal,    s.bold]}>Balance</Text>
        </View>

        {rows.map((row, i) => (
          <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={s.cPeriod}>{row.period}</Text>
            <Text style={s.cInv}>{row.invoiceFmt}</Text>
            <Text style={[s.cIn, s.green]}>{row.moneyInFmt}</Text>
            <Text style={[s.cBal, row.balance > 0 ? s.red : s.green]}>{row.balanceFmt}</Text>
          </View>
        ))}

        {/* Totals footer */}
        <View style={s.tableFooter}>
          <Text style={[s.cPeriod, s.bold]}>Total</Text>
          <Text style={[s.cInv, s.bold]}>{summary.totalInvoicedFmt}</Text>
          <Text style={[s.cIn,  s.bold, s.green]}>{summary.totalPaidFmt}</Text>
          <Text style={[s.cBal, s.bold, summary.balance > 0 ? s.red : s.green]}>
            {summary.balanceFmt}
          </Text>
        </View>

        {/* ── Summary ── */}
        <View style={s.summaryBlock}>
          <View style={s.sumRow}>
            <Text style={s.sumLabel}>Total Invoiced</Text>
            <Text style={s.sumValue}>{summary.totalInvoicedFmt}</Text>
          </View>
          <View style={s.sumRow}>
            <Text style={s.sumLabel}>Total Paid</Text>
            <Text style={[s.sumValue, s.green]}>{summary.totalPaidFmt}</Text>
          </View>
          <View style={s.sumTotalRow}>
            <Text style={s.sumTotalLabel}>Outstanding Balance</Text>
            <Text style={[s.sumTotalValue, summary.balance > 0 ? s.red : s.green]}>
              {summary.balanceFmt}
            </Text>
          </View>
        </View>

        <Text style={s.footer}>
          This statement was automatically generated by {brandName} on {generatedDate}
        </Text>
      </Page>
    </Document>
  );
}

// ─── Shared statement builder ─────────────────────────────────────────────────
async function buildStatement(request, tenantId) {
  const { tenant, overview, branding, arrears: arrearsData } =
    await loadTenantPDFContext(request, tenantId, { includeArrears: true });

  const tenantName   = overview?.full_name    || tenant.full_name || "Unknown";
  const propertyName = overview?.property_name || "";
  const blockName    = overview?.block_name    || "";
  const unitNumber   = String(overview?.unit_number || "");
  const leaseStart   = fmtDate(overview?.lease_start || tenant.lease_start);

  // One row per billing period: period | invoice (amount_due) | money in (amount_paid) | running balance
  let runningBalance = 0;
  const rows = (arrearsData || []).map((a) => {
    const invoice = Number(a.amount_due  || 0);
    const moneyIn = Number(a.amount_paid || 0);
    runningBalance += invoice - moneyIn;
    return {
      period: fmtMonth(a.month),
      invoiceFmt: fmt(invoice),
      moneyInFmt: fmt(moneyIn),
      balance: runningBalance,
      balanceFmt: runningBalance < 0
        ? `${fmt(Math.abs(runningBalance))} CR`
        : fmt(runningBalance),
    };
  });

  const totalInvoiced = (arrearsData || []).reduce((acc, a) => acc + Number(a.amount_due  || 0), 0);
  const totalPaid     = (arrearsData || []).reduce((acc, a) => acc + Number(a.amount_paid || 0), 0);
  const balance       = totalInvoiced - totalPaid;
  const summary = {
    totalInvoicedFmt: fmt(totalInvoiced),
    totalPaidFmt:     fmt(totalPaid),
    balance,
    balanceFmt: balance < 0 ? `${fmt(Math.abs(balance))} CR` : fmt(balance),
  };

  const now = new Date();
  const generatedDate = fmtDate(now);
  const fileName = `statement-${String(tenantName).replace(/\s+/g, "-").toLowerCase()}-${now.toISOString().slice(0, 10)}.pdf`;

  const doc = (
    <StatementPDF
      tenantName={tenantName}
      tenantEmail={tenant.email}
      propertyName={propertyName}
      blockName={blockName}
      unitNumber={unitNumber}
      leaseStart={leaseStart}
      rows={rows}
      summary={summary}
      generatedDate={generatedDate}
      branding={branding}
    />
  );

  const pdfBuffer = await renderToBuffer(doc);

  return { pdfBuffer, fileName, tenantEmail: tenant.email, tenantName, propertyName, blockName, unitNumber,
           branding, summary: { ...summary, totalInvoiced: totalInvoiced, totalPaid } };
}

// ─── GET: download statement PDF ──────────────────────────────────────────────
export async function loader({ request, params }) {
  try {
    const tenantId = params?.tenantId;
    if (!tenantId) {
      return json({ success: false, error: "Tenant id is required." }, { status: 400 });
    }
    const { pdfBuffer, fileName } = await buildStatement(request, tenantId);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return json(
      { success: false, error: error.message || "Failed to generate statement." },
      { status: 500 },
    );
  }
}

// ─── POST: email statement to tenant ─────────────────────────────────────────
export async function action({ request, params }) {
  try {
    if (!resend) {
      return json({ success: false, error: "Email service not configured." }, { status: 500 });
    }
    const tenantId = params?.tenantId;
    if (!tenantId) {
      return json({ success: false, error: "Tenant id is required." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const message = (body.message || "").trim() ||
      "Please find attached your account statement showing all invoices and payments to date. Please review and contact us if you have any questions.";

    const { pdfBuffer, fileName, tenantEmail, tenantName, propertyName, blockName, unitNumber, summary, branding } =
      await buildStatement(request, tenantId);

    if (!tenantEmail) {
      return json({ success: false, error: "Tenant has no email address on file." }, { status: 400 });
    }

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1d4ed8;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h2 style="margin:0">Statement of Account</h2>
        <p style="margin:4px 0;font-size:13px">${branding.displayName}</p>
      </div>
      <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb">
        <p>Dear <strong>${tenantName}</strong>,</p>
        <p>${message}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:600;color:#6b7280;width:140px">Property</td><td style="padding:8px">${propertyName}</td></tr>
          ${blockName ? `<tr><td style="padding:8px;font-weight:600;color:#6b7280">Block</td><td style="padding:8px">${blockName}</td></tr>` : ""}
          <tr><td style="padding:8px;font-weight:600;color:#6b7280">Unit</td><td style="padding:8px">${unitNumber}</td></tr>
          <tr><td style="padding:8px;font-weight:600;color:#6b7280">Total Invoiced</td><td style="padding:8px">${summary.totalInvoicedFmt}</td></tr>
          <tr><td style="padding:8px;font-weight:600;color:#16a34a">Total Paid</td><td style="padding:8px;color:#16a34a;font-weight:600">${summary.totalPaidFmt}</td></tr>
          <tr><td style="padding:8px;font-weight:600;color:#6b7280">Outstanding</td>
            <td style="padding:8px;color:${summary.balance > 0 ? "#dc2626" : "#16a34a"};font-weight:700">${summary.balanceFmt}</td></tr>
        </table>
        <p style="font-size:13px;color:#6b7280">
          The full statement with all invoices and payment history is attached as a PDF.
        </p>
      </div>
      <div style="background:#f3f4f6;padding:12px;text-align:center;font-size:12px;color:#6b7280;border-radius:0 0 8px 8px">
        ${branding.displayName} &copy; ${new Date().getFullYear()}
      </div>
    </body></html>`;

    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: tenantEmail,
      subject: `Account Statement — ${tenantName}`,
      html,
      attachments: [{ filename: fileName, content: pdfBuffer }],
    });

    if (error) throw new Error(error.message);
    return json({ success: true, messageId: data?.id });
  } catch (error) {
    return json(
      { success: false, error: error.message || "Failed to send statement." },
      { status: 500 },
    );
  }
}
