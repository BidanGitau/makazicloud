import { Resend } from "resend";

import { requireApiPermission } from "./_pdf-context";

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;
export const emailFrom =
  process.env.EMAIL_FROM || "MakaziCloud <noreply@support.makazicloud.com>";

export const json = (body, init = {}) =>
  Response.json(body, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

export const fmt = (n) => `KSh ${Number(n || 0).toLocaleString()}`;

export const fmtDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB");
};

export const fmtMonth = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

export const parseBillingMonth = (value) => {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}-01T00:00:00`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

export const billingMonthFromRequest = (request) => {
  const url = new URL(request.url);
  return url.searchParams.get("month");
};

/** GET handler that renders a tenant PDF and returns it as a download. */
export function createPdfDownloadLoader(buildPdf, failureMessage) {
  return async function loader({ request, params }) {
    try {
      await requireApiPermission(request, "reports:export");
      const tenantId = params?.tenantId;
      if (!tenantId) {
        return json(
          { success: false, error: "Tenant id is required." },
          { status: 400 },
        );
      }
      const { pdfBuffer, fileName } = await buildPdf(request, tenantId, {
        month: billingMonthFromRequest(request),
      });
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      const status = /permission/i.test(error.message) ? 403 : 500;
      return json(
        { success: false, error: error.message || failureMessage },
        { status },
      );
    }
  };
}
