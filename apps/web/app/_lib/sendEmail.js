import { getTenantHeaders } from "./api/client";

const batchSend = async (urls, method, bodyFn) => {
  const results = await Promise.allSettled(
    urls.map((url) =>
      fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getTenantHeaders() },
        body: JSON.stringify(bodyFn(url)),
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed: ${url}`);
        return data;
      }),
    ),
  );
  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
    errors: results
      .filter((r) => r.status === "rejected")
      .map((r) => r.reason?.message || "Unknown error"),
  };
};

/**
 * Sends an invoice email with PDF to one or more tenants.
 * Calls POST /documents/tenants/[id]/invoice
 */
export async function sendInvoiceEmails(tenantIds, message) {
  const ids = Array.isArray(tenantIds) ? tenantIds : [tenantIds];
  return batchSend(
    ids.map((id) => `/documents/tenants/${id}/invoice`),
    "POST",
    () => ({ message }),
  );
}

/**
 * Sends a statement of account email with PDF to one or more tenants.
 * Calls POST /documents/tenants/[id]/statement
 */
export async function sendStatementEmails(tenantIds, message) {
  const ids = Array.isArray(tenantIds) ? tenantIds : [tenantIds];
  return batchSend(
    ids.map((id) => `/documents/tenants/${id}/statement`),
    "POST",
    () => ({ message }),
  );
}

/**
 * Sends an arrears reminder email with a PDF attachment to one or more tenants.
 * Calls POST /api/email/arrears
 *
 * @param {string|string[]} tenantIds - single ID or array of IDs
 * @returns {Promise<{ sent: number, failed: number, errors: string[] }>}
 */
export async function sendArrearEmails(tenantIds, message) {
  const ids = Array.isArray(tenantIds) ? tenantIds : [tenantIds];

  const results = await Promise.allSettled(
    ids.map((tenantId) =>
      fetch("/api/email/arrears", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, message }),
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed for tenant ${tenantId}`);
        return data;
      }),
    ),
  );

  const errors = results
    .filter((r) => r.status === "rejected")
    .map((r) => r.reason?.message || "Unknown error");

  return {
    sent: results.filter((r) => r.status === "fulfilled").length,
    failed: errors.length,
    errors,
  };
}
