"use client";


export const paymentHistoryColumns = [
  {
    name: "Payment Date",
    selector: (row) => row.payment_date || row.date || "",
    cell: (row) =>
      row.is_summary
        ? "TOTAL"
        : row.payment_date || row.date
          ? new Date(row.payment_date || row.date).toLocaleDateString()
          : "-",
    sortable: true,
    grow: 1.2,
  },
  {
    name: "Reference",
    selector: (row) => row.reference || "-",
    cell: (row) => row.reference || "-",
    sortable: true,
    grow: 1.2,
  },
  {
    name: "Method",
    selector: (row) => row.method || "-",
    cell: (row) => row.method || "-",
    sortable: true,
    grow: 1,
  },
  {
    name: "Amount (KSh)",
    selector: (row) => Number(row.amount || 0),
    cell: (row) => `KSh ${Number(row.amount || 0).toLocaleString("en-KE")}`,
    sortable: true,
    style: { justifyContent: "flex-end" },
    grow: 1,
  },
];


export const pdfExportColumns = [
  { key: "date", label: "Date", type: "date", width: "20%" },
  { key: "description", label: "Description", width: "26%" },
  { key: "reference", label: "Reference", width: "22%" },
  { key: "method", label: "Method", width: "16%" },
  { key: "amount", label: "Amount", type: "currency", width: "16%" },
];


export const formatPaymentForPDF = (payment) => ({
  date: payment.date || payment.payment_date || null,
  description: payment.description || "Rent Payment",
  reference: payment.reference || "-",
  amount: Number(payment.amount || 0),
  method: payment.method || "-",
});


export const formatPaymentsForPDF = (payments, summary = null) => {
  if (!payments || !Array.isArray(payments)) return [];
  const rows = payments.map(formatPaymentForPDF);

  if (!summary) return rows;

  rows.push({
    date: null,
    description: "TOTAL",
    reference: "",
    method: `${summary.totalPayments || 0} payments`,
    amount: Number(summary.totalAmount || 0),
  });

  return rows;
};


const getMonthsInRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  if (end < start) return 1;

  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1
  );
};

export const calculatePaymentSummary = (
  payments,
  rentAmount = 0,
  startDate,
  endDate
) => {
  if (!payments || !Array.isArray(payments)) {
    const monthsInRange = getMonthsInRange(startDate, endDate);
    const expectedRent = Number(rentAmount || 0) * monthsInRange;
    return {
      totalPayments: 0,
      totalAmount: 0,
      rentAmount: Number(rentAmount || 0),
      monthsInRange,
      expectedRent,
      variance: 0 - expectedRent,
    };
  }

  const monthsInRange = getMonthsInRange(startDate, endDate);
  const normalizedRentAmount = Number(rentAmount || 0);
  const totalPayments = payments.length;
  const totalAmount = payments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0
  );
  const expectedRent = normalizedRentAmount * monthsInRange;

  return {
    totalPayments,
    totalAmount,
    rentAmount: normalizedRentAmount,
    monthsInRange,
    expectedRent,
    variance: totalAmount - expectedRent,
  };
};


export const generatePDFMetadata = (tenant, startDate, endDate, summary) => {
  const tenantName =
    tenant?.tenant_name || tenant?.full_name || tenant?.name || "N/A";
  const property = tenant?.property_name || tenant?.property || "N/A";
  const block = tenant?.block_name || tenant?.block || "N/A";
  const unit = tenant?.unit_number || tenant?.unit || "N/A";
  const variance = Number(summary?.variance || 0);

  return {
    Tenant: tenantName,
    Property: property,
    Block: block,
    Unit: unit,
    Period: `${startDate} to ${endDate}`,
    "Monthly Rent": `KSh ${Number(summary?.rentAmount || 0).toLocaleString()}`,
    "Months in Range": Number(summary?.monthsInRange || 0),
    "Expected Rent": `KSh ${Number(summary?.expectedRent || 0).toLocaleString()}`,
    "Total Payments": Number(summary?.totalPayments || 0),
    "Total Paid": `KSh ${Number(summary?.totalAmount || 0).toLocaleString()}`,
    "Variance (Paid-Expected)": `KSh ${variance.toLocaleString()}`,
    Generated: new Date().toLocaleDateString(),
  };
};


export const generatePDFFilename = (tenant, startDate, endDate) => {
  const tenantName =
    (tenant?.tenant_name || tenant?.full_name || "tenant")
      .replace(/\s+/g, "-")
      .toLowerCase();
  return `tenant-report-${tenantName}-${startDate}-to-${endDate}.pdf`;
};
