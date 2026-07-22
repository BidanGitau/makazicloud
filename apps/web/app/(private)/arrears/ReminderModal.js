"use client";
import { useEffect, useMemo, useState } from "react";
import Button from "@/app/_components/Button";
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
  const [loading, setLoading] = useState(false);

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
    if (isOpen) setPreviewIndex(0);
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

  const handleSend = async () => {
    if (recipients.length === 0) return alert("No phone numbers to send to.");
    setLoading(true);

    try {
      await apiFetch("/sms", {
        method: "POST",
        body: {
          messages: recipients.map((recipient) => ({
            phoneNumber: recipient.phoneNumber,
            message: buildReminderMessage(recipient, extraMessage),
          })),
        },
      });

      setExtraMessage("");
      onClose();
    } catch (error) {
      console.error(error);
      alert(error?.message || "Something went wrong while sending the reminder.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Send Reminder to {recipientLabel}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {isBulk
                ? `Each tenant will receive their own arrears balance in the SMS.`
                : "This message will be sent to the tenant's registered phone."}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 pt-4">
          {isBulk && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Arrears amounts are generated per tenant in the background.
            </div>
          )}

          {recipients.length === 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              No phone numbers found. Make sure tenants have a phone number saved.
            </div>
          )}

          {previewRecipient && (
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
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
              <p className="mt-1 whitespace-pre-line text-gray-600">{previewMessage}</p>
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Extra message
          </label>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            rows={4}
            placeholder="Add a personal note, payment instructions, or deadline..."
            value={extraMessage}
            onChange={(e) => setExtraMessage(e.target.value)}
          />

          <div className="mt-5 flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading || recipients.length === 0}>
              {loading ? "Sending..." : `Send to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
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
