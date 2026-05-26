"use client";
import { useState } from "react";
import Button from "@/app/_components/Button";

export default function ReminderModal({
  isOpen,
  onClose,
  tenant,
  phoneNumbers: phoneNumbersProp,
  defaultMessage = "",
}) {
  const [message, setMessage] = useState(defaultMessage);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;


  const phoneNumbers = phoneNumbersProp?.length
    ? phoneNumbersProp
    : tenant?.tenantPhone
    ? [tenant.tenantPhone]
    : [];

  const isBulk = phoneNumbers.length > 1;
  const recipientLabel = tenant
    ? tenant.tenantName
    : `${phoneNumbers.length} tenant${phoneNumbers.length !== 1 ? "s" : ""}`;

  const handleSend = async () => {
    if (!message.trim()) return alert("Please enter a message.");
    if (phoneNumbers.length === 0) return alert("No phone numbers to send to.");
    setLoading(true);

    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumbers, message }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setMessage("");
      onClose();
    } catch (error) {
      console.error(error);
      alert("Something went wrong while sending the reminder.");
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
                ? `This message will be sent to ${phoneNumbers.length} tenants.`
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
              Please double-check the message before sending to everyone.
            </div>
          )}

          {phoneNumbers.length === 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              No phone numbers found. Make sure tenants have a phone number saved.
            </div>
          )}

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message
          </label>
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            rows={5}
            placeholder="Enter your reminder message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div className="mt-5 flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading || phoneNumbers.length === 0}>
              {loading ? "Sending..." : `Send to ${phoneNumbers.length} recipient${phoneNumbers.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
