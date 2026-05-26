"use client";

import { useState, useMemo } from "react";
import { X, Mail, Users, CheckCircle, AlertCircle, Loader, Building2, ChevronDown } from "lucide-react";
import { sendInvoiceEmails } from "@/app/_lib/sendEmail";

const DEFAULT_MESSAGE =
  "Please find attached your invoice for the current billing period. Kindly settle the outstanding balance by the due date.";

export default function BulkInvoiceModal({ isOpen, onClose, tenants = [] }) {
  const [statusFilter, setStatusFilter] = useState("active");
  const [selectedProperties, setSelectedProperties] = useState(new Set());
  const [allPropertiesSelected, setAllPropertiesSelected] = useState(true);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);


  const properties = useMemo(() => {
    const map = new Map();
    tenants.forEach((t) => {
      if (t.property_name && !map.has(t.property_name)) {
        map.set(t.property_name, { name: t.property_name, id: t.property_id || t.property_name });
      }
    });
    return [...map.values()];
  }, [tenants]);

  const toggleProperty = (name) => {
    setAllPropertiesSelected(false);
    setSelectedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleAllProperties = () => {
    if (allPropertiesSelected) {
      setAllPropertiesSelected(false);
      setSelectedProperties(new Set());
    } else {
      setAllPropertiesSelected(true);
      setSelectedProperties(new Set());
    }
  };

  const isPropertySelected = (name) => allPropertiesSelected || selectedProperties.has(name);

  const pooledTenants = useMemo(() => {
    const base = statusFilter === "active" ? tenants.filter((t) => t.status === "active") : tenants;
    if (allPropertiesSelected) return base;
    return base.filter((t) => selectedProperties.has(t.property_name));
  }, [tenants, statusFilter, allPropertiesSelected, selectedProperties]);

  if (!isOpen) return null;

  const activeTenants = tenants.filter((t) => t.status === "active");
  const targetIds = pooledTenants.map((t) => t.tenant_id).filter(Boolean);
  const currentMessage = message || DEFAULT_MESSAGE;

  const handleSend = async () => {
    if (targetIds.length === 0) return;
    setStatus("sending");
    try {
      const res = await sendInvoiceEmails(targetIds, currentMessage);
      setResult(res);
      setStatus(res.failed > 0 && res.sent === 0 ? "error" : "done");
    } catch (err) {
      setResult({ sent: 0, failed: targetIds.length, errors: [err.message] });
      setStatus("error");
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setResult(null);
    setMessage("");
    setStatusFilter("active");
    setSelectedProperties(new Set());
    setAllPropertiesSelected(true);
    onClose();
  };

  const propertyTenantCount = (propName) =>
    pooledTenants.filter((t) => t.property_name === propName).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">


        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Send Invoices</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>


        <div className="px-5 py-4 space-y-5 overflow-y-auto flex-1">
          {status === "idle" && (
            <>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Tenant status</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                  <button
                    onClick={() => setStatusFilter("active")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                      statusFilter === "active" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Active only ({activeTenants.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors border-l border-gray-200 ${
                      statusFilter === "all" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    All tenants ({tenants.length})
                  </button>
                </div>
              </div>


              {properties.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">
                    Select properties
                  </label>
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">

                    <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={allPropertiesSelected}
                        onChange={toggleAllProperties}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-gray-800">All properties</span>
                      <span className="ml-auto text-xs text-gray-400">
                        {pooledTenants.length} tenant{pooledTenants.length !== 1 ? "s" : ""}
                      </span>
                    </label>


                    {properties.map((prop) => {
                      const count = propertyTenantCount(prop.name);
                      const checked = isPropertySelected(prop.name);
                      return (
                        <label
                          key={prop.name}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProperty(prop.name)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="text-sm text-gray-800 flex-1">{prop.name}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {count} tenant{count !== 1 ? "s" : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {targetIds.length} invoice{targetIds.length !== 1 ? "s" : ""} will be sent. Tenants without an email address will be skipped.
                  </p>
                </div>
              )}


              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Message{" "}
                  <span className="text-gray-400 font-normal">(included in each email)</span>
                </label>
                <textarea
                  value={currentMessage}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  className="text-xs text-blue-500 hover:underline mt-1"
                >
                  Reset to default
                </button>
              </div>

              <p className="text-xs text-gray-400">
                Invoices are auto-generated per tenant based on their billing cycle. The PDF will be attached to each email.
              </p>
            </>
          )}

          {status === "sending" && (
            <div className="flex flex-col items-center gap-3 py-6 text-gray-600">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm">Sending {targetIds.length} invoice emails…</p>
              <p className="text-xs text-gray-400">This may take a moment.</p>
            </div>
          )}

          {(status === "done" || status === "error") && result && (
            <div className="space-y-3 py-2">
              {result.sent > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {result.sent} invoice{result.sent > 1 ? "s" : ""} sent successfully.
                </div>
              )}
              {result.failed > 0 && (
                <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {result.failed} failed (no email or send error).
                  </div>
                  {result.errors.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-xs pl-6 text-red-500">{e}</p>
                  ))}
                  {result.errors.length > 3 && (
                    <p className="text-xs pl-6 text-red-400">…and {result.errors.length - 3} more</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>


        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {status === "done" || status === "error" ? "Close" : "Cancel"}
          </button>
          {status === "idle" && (
            <button
              onClick={handleSend}
              disabled={targetIds.length === 0}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="w-4 h-4" />
              Send {targetIds.length} Invoice{targetIds.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
