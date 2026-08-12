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
  const primary = paymentInfo?.primary || {};
  const bank = paymentInfo?.bank || {};
  const mpesa = paymentInfo?.mpesa || {};

  if (primary.type) {
    if (primary.type === "account") {
      const details = [
        primary.account_name ? `Name: ${primary.account_name}` : "",
        primary.account_number ? `Account: ${primary.account_number}` : "",
      ].filter(Boolean);
      lines.push({
        label: "Account",
        value: details.length ? details.join(" | ") : "Account payment accepted",
      });
    }

    if (primary.type === "phone") {
      lines.push({
        label: "Phone Payment",
        value: primary.phone_number || "Phone payment accepted",
      });
    }

    if (primary.type === "mpesa_paybill") {
      const details = [
        primary.paybill ? `PayBill: ${primary.paybill}` : "",
        primary.account_number ? `Account: ${primary.account_number}` : "",
      ].filter(Boolean);
      lines.push({
        label: "M-Pesa Paybill",
        value: details.length ? details.join(" | ") : "M-Pesa Paybill accepted",
      });
    }

    if (primary.type === "mpesa_till") {
      lines.push({
        label: "M-Pesa Till",
        value: primary.till_number ? `Till: ${primary.till_number}` : "M-Pesa Till accepted",
      });
    }

    if (primary.instructions) {
      lines.push({ label: "Note", value: primary.instructions });
    }
  }

  if (!lines.length && (bank.enabled || bank.account_number)) {
    const details = [
      bank.account_name ? `Name: ${bank.account_name}` : "",
      bank.account_number ? `Account: ${bank.account_number}` : "",
    ].filter(Boolean);
    lines.push({
      label: "Bank Transfer",
      value: details.length ? details.join(" | ") : "Bank transfer accepted",
    });
  }

  if (!lines.length && (mpesa.enabled || mpesa.paybill)) {
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
