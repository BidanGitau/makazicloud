"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader,
  MessageSquareText,
  Send,
  X,
} from "lucide-react";
import { apiFetch } from "@/app/_lib/api/client";
import { formatKes, formatMonth } from "./utils/arrearsFormatters";

export default function ReminderModal({
  isOpen,
  onClose,
  tenant,
  phoneNumbers: phoneNumbersProp,
  recipients: recipientsProp = [],
  defaultMessage = "",
}) {
  const [extraMessage, setExtraMessage] = useState(defaultMessage);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isOpen) setExtraMessage(defaultMessage);
  }, [defaultMessage, isOpen]);

  const recipients = useMemo(() => {
    if (recipientsProp.length) return recipientsProp;

    const phoneNumbers = phoneNumbersProp?.length
      ? phoneNumbersProp
      : tenant?.tenantPhone
        ? [tenant.tenantPhone]
        : [];

    return phoneNumbers.map((phoneNumber) => ({
      phoneNumber,
      tenantName: tenant?.tenantName || "",
      propertyName: tenant?.propertyName || "",
      unitNumber: tenant?.unitNumber || "",
      totalBalance: Number(tenant?.totalBalance || tenant?.balance || 0),
      monthCount: Number(tenant?.monthCount || 0),
      rows: tenant?.rows || [],
    }));
  }, [phoneNumbersProp, recipientsProp, tenant]);

  useEffect(() => {
    if (isOpen) {
      setPreviewIndex(0);
      setStatus("idle");
      setResult(null);
    }
  }, [isOpen, recipients]);

  if (!isOpen) return null;

  const isBulk = recipients.length > 1;
  const recipientLabel = tenant
    ? tenant.tenantName
    : `${recipients.length} tenant${recipients.length !== 1 ? "s" : ""}`;

  const previewRecipient = recipients[Math.min(previewIndex, recipients.length - 1)];
  const previewMessage = previewRecipient
    ? buildReminderMessage(previewRecipient, extraMessage)
    : "";

  const handleClose = () => {
    setStatus("idle");
    setResult(null);
    setExtraMessage("");
    onClose();
  };

  const handleSend = async () => {
    if (recipients.length === 0) return;
    setStatus("sending");

    try {
      const response = await apiFetch("/sms", {
        method: "POST",
        body: {
          messages: recipients.map((recipient) => ({
            phoneNumber: recipient.phoneNumber,
            message: buildReminderMessage(recipient, extraMessage),
          })),
        },
      });
      window.dispatchEvent(
        new CustomEvent("makazicloud:sms-balance-updated", { detail: response }),
      );

      setResult({ sent: recipients.length, failed: 0, errors: [] });
      setStatus("done");
    } catch (error) {
      setResult({
        sent: 0,
        failed: recipients.length,
        errors: [error?.message || "Something went wrong while sending the reminder."],
      });
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Send Arrears SMS
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={status === "sending"}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {status === "idle" && (
            <>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">
                  Send reminder to {recipientLabel}
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {isBulk
                    ? "Each tenant will receive their own arrears balance in the SMS."
                    : "This message will be sent to the tenant's registered phone."}
                </p>
              </div>

              {isBulk && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  Arrears amounts are generated per tenant in the background.
                </div>
              )}

              {recipients.length === 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  No phone numbers found. Make sure tenants have a phone number saved.
                </div>
              )}

              {previewRecipient && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  <div className="font-medium text-gray-900">
                    {isBulk ? "SMS preview by tenant" : "SMS preview"}
                  </div>
                  {isBulk && (
                    <select
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      value={previewIndex}
                      onChange={(event) => setPreviewIndex(Number(event.target.value))}
                    >
                      {recipients.map((recipient, index) => (
                        <option
                          key={`${recipient.phoneNumber}-${recipient.tenantName || index}`}
                          value={index}
                        >
                          {recipient.tenantName || recipient.phoneNumber} - KSh{" "}
                          {formatKes(recipient.totalBalance)}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="mt-2 whitespace-pre-line text-gray-600">
                    {previewMessage}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Extra message{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Add a personal note, payment instructions, or deadline..."
                  value={extraMessage}
                  onChange={(event) => setExtraMessage(event.target.value)}
                />
              </div>

              <p className="text-xs text-gray-400">
                {recipients.length} SMS reminder{recipients.length !== 1 ? "s" : ""} will be sent.
              </p>
            </>
          )}

          {status === "sending" && (
            <div className="flex flex-col items-center gap-3 py-6 text-gray-600">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm">Sending {recipients.length} arrears SMS...</p>
              <p className="text-xs text-gray-400">This may take a moment.</p>
            </div>
          )}

          {(status === "done" || status === "error") && result && (
            <div className="space-y-3 py-2">
              {result.sent > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {result.sent} SMS reminder{result.sent > 1 ? "s" : ""} sent successfully.
                </div>
              )}
              {result.failed > 0 && (
                <div className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {result.failed} failed.
                  </div>
                  {result.errors.slice(0, 3).map((error, index) => (
                    <p key={index} className="pl-6 text-xs text-red-500">
                      {error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button
            onClick={handleClose}
            disabled={status === "sending"}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {status === "done" || status === "error" ? "Close" : "Cancel"}
          </button>
          {status === "idle" && (
            <button
              onClick={handleSend}
              disabled={recipients.length === 0}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Send {recipients.length} SMS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function buildReminderMessage(recipient, extraMessage = "") {
  const tenantName = recipient.tenantName || "Tenant";
  const balance = Number(recipient.totalBalance || 0);
  const monthLabel = buildMonthLabel(recipient);
  const location = [recipient.propertyName, recipient.unitNumber && `Unit ${recipient.unitNumber}`]
    .filter(Boolean)
    .join(", ");
  const locationText = location ? ` for ${location}` : "";
  const extra = extraMessage.trim();

  return [
    `Dear ${tenantName}, this is a rent arrears reminder${locationText}.`,
    `Outstanding balance: KSh ${formatKes(balance)}${monthLabel}.`,
    "Settle the outstanding amount immediately to avoid being inconvenienced.",
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildMonthLabel(recipient) {
  const rows = recipient.rows || [];
  if (rows.length === 1) return ` for ${formatMonth(rows[0].month)}`;

  const monthCount = Number(recipient.monthCount || rows.length || 0);
  if (monthCount > 1) return ` across ${monthCount} months`;

  return "";
}
