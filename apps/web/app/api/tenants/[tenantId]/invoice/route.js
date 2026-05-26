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

const fmtPeriodRange = (start, end) => {
  if (!start || !end) return "";
  return `(${fmtDate(start)} to ${fmtDate(end)})`;
};


const s = StyleSheet.create({
  page:       { padding: 30, fontSize: 10, color: "#111827", fontFamily: "Helvetica" },


  headerRow:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  toBlock:    { maxWidth: "55%" },
  fromBlock:  { maxWidth: "42%", alignItems: "flex-end" },
  invoiceTitle:{ fontSize: 20, fontWeight: 700, color: "#1d4ed8", marginBottom: 6 },
  tenantName: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  companyName:{ fontSize: 11, fontWeight: 700, textAlign: "right", marginBottom: 2 },
  logo:       { width: 44, height: 44, objectFit: "contain", marginBottom: 5 },
  fallbackLogo:{ width: 44, height: 44, backgroundColor: "#1d4ed8", alignItems: "center",
                 justifyContent: "center", marginBottom: 5 },
  fallbackLogoText:{ color: "white", fontSize: 16, fontWeight: 700 },
  muted:      { color: "#6b7280", fontSize: 9, marginBottom: 1 },
  mutedRight: { color: "#6b7280", fontSize: 9, marginBottom: 1, textAlign: "right" },


  metaTable:  { flexDirection: "row", borderWidth: 1, borderColor: "#d1d5db", marginBottom: 16 },
  metaCell:   { flex: 1, padding: 6, borderRightWidth: 1, borderRightColor: "#d1d5db" },
  metaCellLast:{ flex: 1, padding: 6 },
  metaLabel:  { fontSize: 8, color: "#6b7280", marginBottom: 2 },
  metaValue:  { fontSize: 10, fontWeight: 700 },


  tableHead:  { flexDirection: "row", backgroundColor: "#f3f4f6", padding: 7, marginBottom: 0 },
  tableRow:   { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tableRowAlt:{ flexDirection: "row", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", backgroundColor: "#fafafa" },

  colDesc:    { width: "60%", fontSize: 9 },
  colAmt:     { width: "20%", fontSize: 9, textAlign: "right" },
  colTotal:   { width: "20%", fontSize: 9, textAlign: "right" },
  colDescH:   { width: "60%", fontSize: 9, fontWeight: 700 },
  colAmtH:    { width: "20%", fontSize: 9, fontWeight: 700, textAlign: "right" },
  colTotalH:  { width: "20%", fontSize: 9, fontWeight: 700, textAlign: "right" },
  descMain:   { fontWeight: 700, fontSize: 9, marginBottom: 1 },
  descSub:    { color: "#6b7280", fontSize: 8 },


  totalsBlock:{ marginTop: 8, alignItems: "flex-end" },
  totalRow:   { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 3, width: 260 },
  totalLabel: { width: 160, fontSize: 9, color: "#374151" },
  totalValue: { width: 100, fontSize: 9, textAlign: "right" },
  grandTotalRow:{ flexDirection: "row", justifyContent: "flex-end", paddingVertical: 5, width: 260,
                  borderTopWidth: 1, borderTopColor: "#d1d5db", marginTop: 4 },
  grandLabel: { width: 160, fontSize: 11, fontWeight: 700 },
  grandValue: { width: 100, fontSize: 11, fontWeight: 700, textAlign: "right", color: "#dc2626" },


  notesBox:   { marginTop: 20, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 10 },
  noteText:   { fontSize: 8, color: "#6b7280", marginBottom: 2 },
  footer:     { marginTop: 12, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});


function BillingInvoicePDF({
  invoiceNumber, invoiceDate, dueDate, tenantName, tenantEmail,
  propertyName, blockName, unitNumber, leaseStart,
  lineItems, subtotalFmt, totalDueFmt, branding,
}) {
  const brandName = branding?.displayName || "MakaziCloud Property Management";
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View style={s.toBlock}>
            <Text style={s.invoiceTitle}>Tax Invoice</Text>
            <Text style={s.tenantName}>{tenantName}</Text>
            {tenantEmail ? <Text style={s.muted}>{tenantEmail}</Text> : null}
            <Text style={s.muted}>{propertyName}{blockName ? ` — Block ${blockName}` : ""}{unitNumber ? ` — Unit ${unitNumber}` : ""}</Text>
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
          </View>
        </View>

        <View style={s.metaTable}>
          <View style={s.metaCell}><Text style={s.metaLabel}>Currency</Text><Text style={s.metaValue}>KES</Text></View>
          <View style={s.metaCell}><Text style={s.metaLabel}>Invoice Terms</Text><Text style={s.metaValue}>30 Days</Text></View>
          <View style={s.metaCell}><Text style={s.metaLabel}>Invoice Date</Text><Text style={s.metaValue}>{invoiceDate}</Text></View>
          <View style={s.metaCell}><Text style={s.metaLabel}>Due Date</Text><Text style={s.metaValue}>{dueDate}</Text></View>
          <View style={s.metaCellLast}><Text style={s.metaLabel}>Invoice Number</Text><Text style={s.metaValue}>{invoiceNumber}</Text></View>
        </View>

        <View style={s.tableHead}>
          <Text style={s.colDescH}>Description</Text>
          <Text style={s.colAmtH}>Amount</Text>
          <Text style={s.colTotalH}>Total (KSh)</Text>
        </View>

        {lineItems.map((item, i) => (
          <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <View style={s.colDesc}>
              <Text style={s.descMain}>{item.description}</Text>
              <Text style={s.descSub}>{item.period}</Text>
            </View>
            <Text style={s.colAmt}>{item.amountFmt}</Text>
            <Text style={s.colTotal}>{item.amountFmt}</Text>
          </View>
        ))}

        <View style={s.totalsBlock}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{subtotalFmt}</Text>
          </View>
          <View style={s.grandTotalRow}>
            <Text style={s.grandLabel}>Total Due</Text>
            <Text style={s.grandValue}>{totalDueFmt}</Text>
          </View>
        </View>

        <View style={s.notesBox}>
          <Text style={s.noteText}>Please settle the outstanding balance by the due date to avoid late payment charges.</Text>
          <Text style={s.noteText}>If you have already made payment, please disregard this invoice or contact management for confirmation.</Text>
        </View>

        <Text style={s.footer}>Generated automatically by {brandName} on {invoiceDate}</Text>
      </Page>
    </Document>
  );
}


const parseDueDay = (rentDueDate) => {
  if (typeof rentDueDate === "number" && rentDueDate >= 1 && rentDueDate <= 31)
    return Math.floor(rentDueDate);
  if (typeof rentDueDate === "string" && /^\d+$/.test(rentDueDate)) {
    const parsed = Number(rentDueDate);
    if (parsed >= 1 && parsed <= 31) return Math.floor(parsed);
  }
  if (rentDueDate) {
    const parsedDate = new Date(rentDueDate);
    if (!Number.isNaN(parsedDate.getTime())) return parsedDate.getDate();
  }
  return 1;
};

const buildNextDueDate = (dueDay) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDayThisMonth = new Date(year, month + 1, 0).getDate();
  const thisMonthDue = new Date(year, month, Math.min(dueDay, lastDayThisMonth));
  if (thisMonthDue >= today) return thisMonthDue;
  const lastDayNextMonth = new Date(year, month + 2, 0).getDate();
  return new Date(year, month + 1, Math.min(dueDay, lastDayNextMonth));
};


async function buildInvoice(request, tenantId) {
  const { tenant, resolvedOverview, branding } = await loadTenantPDFContext(
    request,
    tenantId,
  );

  const monthlyRent = Number(resolvedOverview.rent_amount || 0);
  const cycleMonths = tenant.billing_cycle_enabled
    ? Math.max(1, Number(tenant.billing_cycle_months) || 1)
    : 1;
  const dueDay = parseDueDay(tenant.rent_due_date);
  const nextDueDate = buildNextDueDate(dueDay);
  const cycleStartDate = new Date(
    nextDueDate.getFullYear(),
    nextDueDate.getMonth() - (cycleMonths - 1),
    1,
  );

  const lineItems = [];
  const cycleEndDate = new Date(
    cycleStartDate.getFullYear(),
    cycleStartDate.getMonth() + cycleMonths,
    0,
  );
  const cycleLabel = cycleMonths === 1
    ? `Rent — ${fmtMonth(cycleStartDate)}`
    : `Rent — ${cycleMonths} month billing cycle`;

  lineItems.push({
    description: cycleLabel,
    period: fmtPeriodRange(cycleStartDate, cycleEndDate),
    amountFmt: fmt(monthlyRent * cycleMonths),
    amount: monthlyRent * cycleMonths,
  });

  const subtotal = monthlyRent * cycleMonths;
  const now = new Date();
  const invoiceDate = fmtDate(now);
  const invoiceNumber = `${tenantId.slice(0, 3).toUpperCase()}-${now.toISOString().slice(2, 7).replaceAll("-", "")}`;
  const fileName = `invoice-${String(resolvedOverview.full_name || "tenant").replace(/\s+/g, "-").toLowerCase()}-${now.toISOString().slice(0, 10)}.pdf`;
  const dueDateFmt = fmtDate(nextDueDate);

  const doc = (
    <BillingInvoicePDF
      invoiceNumber={invoiceNumber}
      invoiceDate={invoiceDate}
      dueDate={dueDateFmt}
      tenantName={resolvedOverview.full_name}
      tenantEmail={tenant.email}
      propertyName={resolvedOverview.property_name}
      blockName={resolvedOverview.block_name}
      unitNumber={String(resolvedOverview.unit_number || "")}
      leaseStart={fmtDate(resolvedOverview.lease_start)}
      lineItems={lineItems}
      subtotalFmt={fmt(subtotal)}
      totalDueFmt={fmt(subtotal)}
      branding={branding}
    />
  );

  const pdfBuffer = await renderToBuffer(doc);

  return {
    pdfBuffer,
    fileName,
    tenantEmail: tenant.email,
    tenantName: resolvedOverview.full_name,
    subtotalFmt: fmt(subtotal),
    dueDateFmt,
    propertyName: resolvedOverview.property_name,
    blockName: resolvedOverview.block_name,
    unitNumber: String(resolvedOverview.unit_number || ""),
    branding,
  };
}


export async function loader({ request, params }) {
  try {
    const tenantId = params?.tenantId;
    if (!tenantId) {
      return json({ success: false, error: "Tenant id is required." }, { status: 400 });
    }
    const { pdfBuffer, fileName } = await buildInvoice(request, tenantId);
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
      { success: false, error: error.message || "Failed to generate invoice." },
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
      "Please find attached your invoice for the current billing period. Kindly settle the outstanding balance by the due date.";

    const { pdfBuffer, fileName, tenantEmail, tenantName, subtotalFmt, dueDateFmt, propertyName, blockName, unitNumber, branding } =
      await buildInvoice(request, tenantId);

    if (!tenantEmail) {
      return json({ success: false, error: "Tenant has no email address on file." }, { status: 400 });
    }

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:#1d4ed8;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
        <h2 style="margin:0">Invoice</h2>
        <p style="margin:4px 0;font-size:13px">${branding.displayName}</p>
      </div>
      <div style="background:#f9fafb;padding:20px;border:1px solid #e5e7eb">
        <p>Dear <strong>${tenantName}</strong>,</p>
        <p>${message}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;font-weight:600;color:#6b7280;width:140px">Property</td><td style="padding:8px">${propertyName}</td></tr>
          ${blockName ? `<tr><td style="padding:8px;font-weight:600;color:#6b7280">Block</td><td style="padding:8px">${blockName}</td></tr>` : ""}
          <tr><td style="padding:8px;font-weight:600;color:#6b7280">Unit</td><td style="padding:8px">${unitNumber}</td></tr>
          <tr><td style="padding:8px;font-weight:600;color:#6b7280">Amount Due</td><td style="padding:8px;color:#1d4ed8;font-weight:700">${subtotalFmt}</td></tr>
          <tr><td style="padding:8px;font-weight:600;color:#6b7280">Due Date</td><td style="padding:8px">${dueDateFmt}</td></tr>
        </table>
        <p style="font-size:13px;color:#6b7280">The full invoice is attached as a PDF. If you have already made payment, please contact us.</p>
      </div>
      <div style="background:#f3f4f6;padding:12px;text-align:center;font-size:12px;color:#6b7280;border-radius:0 0 8px 8px">
        ${branding.displayName} &copy; ${new Date().getFullYear()}
      </div>
    </body></html>`;

    const { data, error } = await resend.emails.send({
      from: emailFrom,
      to: tenantEmail,
      subject: `Invoice — ${subtotalFmt} due by ${dueDateFmt}`,
      html,
      attachments: [{ filename: fileName, content: pdfBuffer }],
    });

    if (error) throw new Error(error.message);
    return json({ success: true, messageId: data?.id });
  } catch (error) {
    return json(
      { success: false, error: error.message || "Failed to send invoice." },
      { status: 500 },
    );
  }
}
