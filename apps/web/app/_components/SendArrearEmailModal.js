"use client";

import { useState } from "react";
import { X, Mail, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { sendArrearEmails } from "@/app/_lib/sendEmail";

const DEFAULT_MESSAGE =
  "Please be advised that your rent account has an outstanding balance. Kindly settle the arrears at your earliest convenience to avoid further action. The detailed statement is attached for your reference.";

export default function SendArrearEmailModal({ isOpen, onClose, tenants = [] }) {
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  if (!isOpen) return null;

  const handleSend = async () => {
    setStatus("sending");
    try {
      const ids = tenants.map((t) => t.tenant_id);
      const res = await sendArrearEmails(ids, message);
      setResult(res);
      setStatus("done");
    } catch (err) {
      setResult({ sent: 0, failed: tenants.length, errors: [err.message] });
      setStatus("error");
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setResult(null);
    setMessage(DEFAULT_MESSAGE);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-900/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">
              Send Arrears Email{tenants.length > 1 ? ` (${tenants.length})` : ""}
            </h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>


        <div className="px-5 py-4 space-y-4">
          {status === "idle" && (
            <>

              <ul className="max-h-28 overflow-y-auto space-y-1">
                {tenants.map((t) => (
                  <li key={t.tenant_id} className="flex items-center justify-between text-sm py-1.5 px-2 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-800">{t.tenantName}</span>
                    {t.tenantEmail && (
                      <span className="text-xs text-gray-400">{t.tenantEmail}</span>
                    )}
                  </li>
                ))}
              </ul>


              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Message <span className="text-gray-400 font-normal">(included in email body)</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  type="button"
                  onClick={() => setMessage(DEFAULT_MESSAGE)}
                  className="text-xs text-blue-500 hover:underline mt-1"
                >
                  Reset to default
                </button>
              </div>

              <p className="text-xs text-gray-400">
                The arrears PDF will be auto-generated and attached.
              </p>
            </>
          )}

          {status === "sending" && (
            <div className="flex flex-col items-center gap-3 py-6 text-gray-600">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm">Sending {tenants.length > 1 ? "emails" : "email"}…</p>
            </div>
          )}

          {(status === "done" || status === "error") && result && (
            <div className="space-y-3 py-2">
              {result.sent > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {result.sent} email{result.sent > 1 ? "s" : ""} sent successfully.
                </div>
              )}
              {result.failed > 0 && (
                <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {result.failed} failed.
                  </div>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs pl-6 text-red-500">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>


        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {status === "done" || status === "error" ? "Close" : "Cancel"}
          </button>
          {status === "idle" && (
            <button
              onClick={handleSend}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
