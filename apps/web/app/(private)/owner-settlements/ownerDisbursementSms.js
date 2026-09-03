import { formatCurrency } from "@/app/_lib/formatters";

export function formatMonthLabel(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const text = String(value).slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(text)) {
      const [year, month] = text.split("-").map(Number);
      return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-KE", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
    }
    return "—";
  }
  return date.toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildOwnerDisbursementSms({
  ownerName,
  propertyName,
  closeMonth,
  gross,
  commissionAmount,
  commissionRate,
  maintenance,
  advances,
  payout,
}) {
  const owner = ownerName || "Owner";
  const property = propertyName || "your property";
  const month = formatMonthLabel(closeMonth);
  const rate = Number(commissionRate || 0);
  const lines = [
    `Habari ${owner},`,
    `${property} collection for ${month}:`,
    `Collected ${formatCurrency(gross)}.`,
    `Commission ${rate.toFixed(1)}% (${formatCurrency(commissionAmount)}).`,
  ];
  if (Number(maintenance || 0) > 0) {
    lines.push(`Maintenance ${formatCurrency(maintenance)}.`);
  }
  if (Number(advances || 0) > 0) {
    lines.push(`Advances ${formatCurrency(advances)}.`);
  }
  lines.push(`Disbursed to you ${formatCurrency(payout)}.`);
  lines.push("MakaziCloud");
  return lines.join(" ");
}
