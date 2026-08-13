"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Loader,
  MessageSquareText,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "@/app/_lib/api/client";

const DEFAULT_MESSAGE =
  "Hello, this is a notice from the property management office. Please contact us if you need any clarification.";

const getTenantId = (tenant) => tenant?.tenant_id || tenant?.id || "";
const getTenantPhone = (tenant) =>
  tenant?.phone || tenant?.tenantPhone || tenant?.tenant_phone || tenant?.emergency_contact || "";

export default function BulkSmsModal({
  isOpen,
  onClose,
  tenants = [],
  title = "Send Messages",
  defaultMessage = DEFAULT_MESSAGE,
}) {
  const [statusFilter, setStatusFilter] = useState("active");
  const [selectedProperties, setSelectedProperties] = useState(new Set());
  const [allPropertiesSelected, setAllPropertiesSelected] = useState(true);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);

  const properties = useMemo(() => {
    const map = new Map();
    tenants.forEach((tenant) => {
      if (tenant.property_name && !map.has(tenant.property_name)) {
        map.set(tenant.property_name, {
          name: tenant.property_name,
          id: tenant.property_id || tenant.property_name,
        });
      }
    });
    return [...map.values()];
  }, [tenants]);

  const activeTenants = useMemo(
    () =>
      tenants.filter(
        (tenant) => String(tenant.status || "").toLowerCase() === "active",
      ),
    [tenants],
  );

  const pooledTenants = useMemo(() => {
    const base = statusFilter === "active" ? activeTenants : tenants;
    if (allPropertiesSelected) return base;
    return base.filter((tenant) => selectedProperties.has(tenant.property_name));
  }, [activeTenants, allPropertiesSelected, selectedProperties, statusFilter, tenants]);

  const recipients = useMemo(() => {
    const seen = new Set();
    return pooledTenants
      .map((tenant) => {
        const phoneNumber = getTenantPhone(tenant);
        if (!phoneNumber || seen.has(phoneNumber)) return null;
        seen.add(phoneNumber);
        return {
          tenantId: getTenantId(tenant),
          tenantName: tenant.full_name || tenant.tenant_name || "Tenant",
          phoneNumber,
        };
      })
      .filter(Boolean);
  }, [pooledTenants]);

  if (!isOpen) return null;

  const currentMessage = message || defaultMessage;

  const toggleProperty = (name) => {
    setAllPropertiesSelected(false);
    setSelectedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
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

  const isPropertySelected = (name) =>
    allPropertiesSelected || selectedProperties.has(name);

  const propertyTenantCount = (propertyName) =>
    pooledTenants.filter((tenant) => tenant.property_name === propertyName).length;

  const handleClose = () => {
    setStatus("idle");
    setResult(null);
    setMessage("");
    setStatusFilter("active");
    setSelectedProperties(new Set());
    setAllPropertiesSelected(true);
    onClose();
  };

  const handleSend = async () => {
    if (recipients.length === 0 || !currentMessage.trim()) return;
    setStatus("sending");
    try {
      const response = await apiFetch("/sms", {
        method: "POST",
        body: {
          messages: recipients.map((recipient) => ({
            phoneNumber: recipient.phoneNumber,
            message: currentMessage.trim(),
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
        errors: [error?.message || "Failed to send messages."],
      });
      setStatus("error");
    }
  };

  const skippedCount = pooledTenants.length - recipients.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {status === "idle" && (
            <>
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-500">
                  Tenant status
                </label>
                <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm">
                  <button
                    onClick={() => setStatusFilter("active")}
                    className={`flex flex-1 items-center justify-center gap-1.5 py-2 transition-colors ${
                      statusFilter === "active"
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Active only ({activeTenants.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`flex flex-1 items-center justify-center gap-1.5 border-l border-gray-200 py-2 transition-colors ${
                      statusFilter === "all"
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5" />
                    All tenants ({tenants.length})
                  </button>
                </div>
              </div>

              {properties.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-500">
                    Select properties
                  </label>
                  <div className="overflow-hidden rounded-xl border border-gray-200 divide-y divide-gray-100">
                    <label className="flex cursor-pointer items-center gap-3 bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={allPropertiesSelected}
                        onChange={toggleAllProperties}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-gray-800">
                        All properties
                      </span>
                      <span className="ml-auto text-xs text-gray-400">
                        {pooledTenants.length} tenant{pooledTenants.length !== 1 ? "s" : ""}
                      </span>
                    </label>

                    {properties.map((property) => {
                      const checked = isPropertySelected(property.name);
                      const count = propertyTenantCount(property.name);
                      return (
                        <label
                          key={property.name}
                          className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-blue-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProperty(property.name)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <Building2 className="h-4 w-4 flex-shrink-0 text-blue-400" />
                          <span className="flex-1 text-sm text-gray-800">{property.name}</span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                            {count} tenant{count !== 1 ? "s" : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    {recipients.length} message{recipients.length !== 1 ? "s" : ""} will be sent.
                    {skippedCount > 0
                      ? ` ${skippedCount} tenant${skippedCount !== 1 ? "s" : ""} without phone numbers will be skipped.`
                      : ""}
                  </p>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Message{" "}
                  <span className="font-normal text-gray-400">(sent as SMS)</span>
                </label>
                <textarea
                  value={currentMessage}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type a generic message for all selected tenants..."
                />
                <button
                  type="button"
                  onClick={() => setMessage("")}
                  className="mt-1 text-xs text-blue-500 hover:underline"
                >
                  Reset to default
                </button>
              </div>

              <p className="text-xs text-gray-400">
                Every tenant receives the same message. Phone numbers are normalized before sending.
              </p>
            </>
          )}

          {status === "sending" && (
            <div className="flex flex-col items-center gap-3 py-6 text-gray-600">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm">Sending {recipients.length} SMS messages...</p>
              <p className="text-xs text-gray-400">This may take a moment.</p>
            </div>
          )}

          {(status === "done" || status === "error") && result && (
            <div className="space-y-3 py-2">
              {result.sent > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {result.sent} message{result.sent > 1 ? "s" : ""} sent successfully.
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
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {status === "done" || status === "error" ? "Close" : "Cancel"}
          </button>
          {status === "idle" && (
            <button
              onClick={handleSend}
              disabled={recipients.length === 0 || !currentMessage.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageSquareText className="h-4 w-4" />
              Send {recipients.length} Message{recipients.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
