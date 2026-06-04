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
