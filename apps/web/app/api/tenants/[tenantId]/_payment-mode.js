export function fmtPaymentMode(method, fallback = "-") {
  const normalized = String(method || "").toLowerCase();
  return (
    {
      cash: "Cash",
      bank: "Bank transfer",
      mpesa: "M-Pesa",
      cheque: "Cheque",
    }[normalized] || String(method || fallback)
  );
}

export function formatPaymentInstructions(paymentInfo = {}) {
  const lines = [];
  const bank = paymentInfo?.bank || {};
  const mpesa = paymentInfo?.mpesa || {};

  if (bank.enabled) {
    const details = [
      bank.account_name ? `Name: ${bank.account_name}` : "",
      bank.account_number ? `Account: ${bank.account_number}` : "",
    ].filter(Boolean);
    lines.push({
      label: "Bank Transfer",
      value: details.length ? details.join(" | ") : "Bank transfer accepted",
    });
  }

  if (mpesa.enabled) {
    const details = [
      mpesa.paybill ? `PayBill: ${mpesa.paybill}` : "",
      mpesa.account_number ? `Account: ${mpesa.account_number}` : "",
    ].filter(Boolean);
    lines.push({
      label: "M-Pesa",
      value: details.length ? details.join(" | ") : "M-Pesa accepted",
    });
  }

  return lines;
}

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export function paymentInstructionsHtml(paymentInfo = {}) {
  const lines = formatPaymentInstructions(paymentInfo);
  if (!lines.length) {
    return `<p style="font-size:13px;color:#6b7280;margin:8px 0">Payment details will be provided by management.</p>`;
  }
  return `<ul style="margin:8px 0 0 18px;padding:0;color:#374151;font-size:13px">${lines
    .map(
      (line) =>
        `<li style="margin-bottom:4px"><strong>${escapeHtml(line.label)}:</strong> ${escapeHtml(line.value)}</li>`,
    )
    .join("")}</ul>`;
}
