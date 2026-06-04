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

import { apiRows, loadTenantPDFContext } from "../_pdf-context";
import { fmtPaymentMode } from "../_payment-mode";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const emailFrom = process.env.EMAIL_FROM || "MakaziCloud <noreply@contact.makazicloud.com>";

export const runtime = "nodejs";

const json = (body, init = {}) =>
  Response.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });


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

const s = StyleSheet.create({
  page:        { paddingTop: 28, paddingHorizontal: 28, paddingBottom: 42,
                 fontSize: 9, color: "#111827", fontFamily: "Helvetica" },

  brandRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                borderBottomWidth: 2, borderBottomColor: "#1d4ed8", paddingBottom: 10, marginBottom: 14 },
  brandLeft:  { flexDirection: "row", alignItems: "center", maxWidth: "62%" },
  logo:        { width: 40, height: 40, objectFit: "contain", marginRight: 9 },
  fallbackLogo:{ width: 40, height: 40, backgroundColor: "#1d4ed8", alignItems: "center",
                 justifyContent: "center", marginRight: 9 },
  fallbackLogoText:{ color: "white", fontSize: 16, fontWeight: 700 },
  companyName: { fontSize: 11, fontWeight: 700, color: "#0f172a" },
  powered:     { color: "#64748b", fontSize: 8, marginTop: 2 },
  generated:   { color: "#64748b", fontSize: 8, textAlign: "right" },
  title:       { fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 4 },
  muted:       { color: "#64748b", fontSize: 9, marginBottom: 1 },
  tenantName:  { fontSize: 11, fontWeight: 700, marginBottom: 2 },

  metaGrid:    { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: "#e7e5e4",
                 backgroundColor: "#fafaf9", marginTop: 12, marginBottom: 14 },
  metaCell:    { width: "25%", paddingVertical: 7, paddingHorizontal: 8, borderRightWidth: 1,
                 borderRightColor: "#e7e5e4", borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  metaLabel:   { fontSize: 6.5, color: "#64748b", fontWeight: 700, textTransform: "uppercase" },
  metaValue:   { fontSize: 8.5, color: "#111827", marginTop: 2 },

  sectionBar:  { fontSize: 9, fontWeight: 700, color: "#111827", marginTop: 12, marginBottom: 6 },

  table:       { borderWidth: 1, borderColor: "#d6d3d1", marginBottom: 8 },
  tableHead:   { flexDirection: "row", backgroundColor: "#1d4ed8" },
  tableRow:    { flexDirection: "row", minHeight: 24 },
  tableRowAlt: { flexDirection: "row", minHeight: 24, backgroundColor: "#fafaf9" },
  tableFooter: { flexDirection: "row", minHeight: 25, borderTopWidth: 1.5,
                 borderTopColor: "#1d4ed8", backgroundColor: "#eff6ff" },
  bold:        { fontWeight: 700 },
  th:          { paddingVertical: 6, paddingHorizontal: 6, fontSize: 7.5, fontWeight: 700,
                 color: "white", textTransform: "uppercase", borderRightWidth: 1, borderRightColor: "#3b82f6" },
  td:          { paddingVertical: 6, paddingHorizontal: 6, fontSize: 8, color: "#111827",
                 borderBottomWidth: 1, borderBottomColor: "#e7e5e4", borderRightWidth: 1,
                 borderRightColor: "#e7e5e4" },
  tdSmall:     { fontSize: 7 },


  cPeriod: { width: "28%" },
  cInv:    { width: "24%", textAlign: "right" },
  cIn:     { width: "24%", textAlign: "right" },
  cBal:    { width: "24%", textAlign: "right" },
  pDate:   { width: "22%" },
  pMode:   { width: "22%" },
  pRef:    { width: "36%" },
  pAmt:    { width: "20%", textAlign: "right" },

  red:   { color: "#dc2626" },
  green: { color: "#16a34a" },

  footer: { position: "absolute", bottom: 18, left: 28, right: 28, paddingTop: 7,
            borderTopWidth: 1, borderTopColor: "#e7e5e4", fontSize: 7, color: "#94a3b8",
            textAlign: "center" },
});


function StatementPDF({
  tenantName, tenantEmail, propertyName, blockName, unitNumber, leaseStart,
  rows, payments, summary, generatedDate, branding,
}) {
  const brandName = branding?.displayName || "MakaziCloud Property Management";
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.brandRow}>
          <View style={s.brandLeft}>
            {branding?.logoDataUrl ? (
              <Image src={branding.logoDataUrl} style={s.logo} />
            ) : (
              <View style={s.fallbackLogo}>
                <Text style={s.fallbackLogoText}>M</Text>
              </View>
            )}
            <View>
              <Text style={s.companyName}>{brandName}</Text>
              <Text style={s.powered}>Powered by MakaziCloud</Text>
            </View>
          </View>
          <Text style={s.generated}>Generated {generatedDate}</Text>
        </View>

        <Text style={s.title}>Statement of Account</Text>
        <Text style={s.tenantName}>{tenantName}</Text>
        {tenantEmail ? <Text style={s.muted}>{tenantEmail}</Text> : null}
        <Text style={s.muted}>
          {propertyName}
          {blockName ? ` — Block ${blockName}` : ""}
          {unitNumber ? ` — Unit ${unitNumber}` : ""}
        </Text>

        <View style={s.metaGrid}>
          <View style={s.metaCell}><Text style={s.metaLabel}>Lease Start</Text><Text style={s.metaValue}>{leaseStart || "-"}</Text></View>
          <View style={s.metaCell}><Text style={s.metaLabel}>Total Invoiced</Text><Text style={s.metaValue}>{summary.totalInvoicedFmt}</Text></View>
          <View style={s.metaCell}><Text style={s.metaLabel}>Total Paid</Text><Text style={s.metaValue}>{summary.totalPaidFmt}</Text></View>
          <View style={s.metaCell}><Text style={s.metaLabel}>Outstanding</Text><Text style={s.metaValue}>{summary.balanceFmt}</Text></View>
        </View>


        <Text style={s.sectionBar} minPresenceAhead={72}>Account Statement</Text>
        <View style={s.table}>
          <View style={s.tableHead} wrap={false}>
            <Text style={[s.th, s.cPeriod]}>Period</Text>
            <Text style={[s.th, s.cInv]}>Invoice</Text>
            <Text style={[s.th, s.cIn]}>Money In</Text>
            <Text style={[s.th, s.cBal]}>Balance</Text>
          </View>

          {rows.map((row, i) => (
            <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
              <Text style={[s.td, s.cPeriod]}>{row.period}</Text>
              <Text style={[s.td, s.cInv]}>{row.invoiceFmt}</Text>
              <Text style={[s.td, s.cIn, s.green]}>{row.moneyInFmt}</Text>
              <Text style={[s.td, s.cBal, row.balance > 0 ? s.red : s.green]}>{row.balanceFmt}</Text>
            </View>
          ))}

          <View style={s.tableFooter} wrap={false}>
            <Text style={[s.td, s.cPeriod, s.bold]}>Total</Text>
            <Text style={[s.td, s.cInv, s.bold]}>{summary.totalInvoicedFmt}</Text>
            <Text style={[s.td, s.cIn, s.bold, s.green]}>{summary.totalPaidFmt}</Text>
            <Text style={[s.td, s.cBal, s.bold, summary.balance > 0 ? s.red : s.green]}>
              {summary.balanceFmt}
            </Text>
          </View>
        </View>

        <Text style={s.sectionBar} minPresenceAhead={72}>Payment Details</Text>
        <View style={s.table}>
          <View style={s.tableHead} wrap={false}>
            <Text style={[s.th, s.pDate]}>Date</Text>
            <Text style={[s.th, s.pMode]}>Mode</Text>
            <Text style={[s.th, s.pRef]}>Reference</Text>
            <Text style={[s.th, s.pAmt]}>Amount</Text>
          </View>
          {payments.length > 0 ? (
            payments.map((payment, i) => (
              <View key={payment.id || i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt} wrap={false}>
                <Text style={[s.td, s.pDate]}>{payment.paymentDate}</Text>
                <Text style={[s.td, s.pMode]}>{payment.method}</Text>
                <Text style={[s.td, s.tdSmall, s.pRef]}>{payment.reference}</Text>
                <Text style={[s.td, s.pAmt, s.green]}>{payment.amountFmt}</Text>
              </View>
            ))
          ) : (
            <View style={s.tableRow} wrap={false}>
              <Text style={[s.td, { width: "100%", color: "#64748b" }]}>No payments recorded.</Text>
            </View>
          )}
        </View>

        <Text style={s.footer} fixed>
          This statement was automatically generated by {brandName} on {generatedDate}
        </Text>
      </Page>
    </Document>
  );
}


async function buildStatement(request, tenantId) {
  const { tenant, resolvedOverview, branding, arrears: arrearsData } =
    await loadTenantPDFContext(request, tenantId, { includeArrears: true });
  const paymentRows = await apiRows(request, "payments", {
    tenant_id: tenantId,
    orderBy: "payment_date",
    order: "asc",
  });

  const tenantName   = resolvedOverview.full_name || tenant.full_name || "Unknown";
  const propertyName = resolvedOverview.property_name || "";
  const blockName    = resolvedOverview.block_name || "";
  const unitNumber   = String(resolvedOverview.unit_number || "");
  const leaseStart   = fmtDate(resolvedOverview.lease_start || tenant.lease_start);


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

  const payments = (paymentRows || []).map((payment) => ({
    id: payment.id,
    paymentDate: fmtDate(payment.payment_date),
    method: fmtPaymentMode(payment.method),
    reference: payment.reference || "-",
    amountFmt: fmt(payment.amount),
  }));
  const latestPaymentMode = payments[payments.length - 1]?.method || "-";

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
      payments={payments}
      summary={summary}
      generatedDate={generatedDate}
      branding={branding}
    />
  );

  const pdfBuffer = await renderToBuffer(doc);

  return { pdfBuffer, fileName, tenantEmail: tenant.email, tenantName, propertyName, blockName, unitNumber,
           latestPaymentMode, branding, summary: { ...summary, totalInvoiced: totalInvoiced, totalPaid } };
}


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

    const { pdfBuffer, fileName, tenantEmail, tenantName, propertyName, blockName, unitNumber, latestPaymentMode, summary, branding } =
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
          <tr><td style="padding:8px;font-weight:600;color:#6b7280">Latest Payment Mode</td><td style="padding:8px">${latestPaymentMode}</td></tr>
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
