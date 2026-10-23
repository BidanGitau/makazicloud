import { ClipboardCheck, ReceiptText } from "lucide-react";

import { currencyOrDash, numberOrBlank } from "./utils/settlementMath";

export const tabs = [
  { id: "close", label: "Disbursement", Icon: ClipboardCheck },
  { id: "deductions", label: "Deductions", Icon: ReceiptText },
];

export const payoutModes = [
  { value: "", label: "How to pay" },
  { value: "bank", label: "Bank Transfer" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
];

export const breakdownColumns = [
  { header: "Item", key: "item", width: "34%" },
  {
    header: "Amount",
    key: "amount",
    width: "22%",
    render: currencyOrDash,
    excelRender: numberOrBlank,
  },
  { header: "Notes", key: "notes", width: "44%" },
];
