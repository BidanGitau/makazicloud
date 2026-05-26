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


export async function sendInvoiceEmails(tenantIds, message) {
  const ids = Array.isArray(tenantIds) ? tenantIds : [tenantIds];
  return batchSend(
    ids.map((id) => `/documents/tenants/${id}/invoice`),
    "POST",
    () => ({ message }),
  );
}


export async function sendStatementEmails(tenantIds, message) {
  const ids = Array.isArray(tenantIds) ? tenantIds : [tenantIds];
  return batchSend(
    ids.map((id) => `/documents/tenants/${id}/statement`),
    "POST",
    () => ({ message }),
  );
}


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
