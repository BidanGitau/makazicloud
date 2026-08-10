"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Monitor,
  RefreshCw,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { apiFetch } from "@/app/_lib/api/client";
import { useAuth } from "@/app/_context/AuthContext";
import ModalSlider from "@/app/_components/ModalSlider";

const FILTERS = [
  { value: "", label: "All" },
  { value: "true", label: "Successful" },
  { value: "false", label: "Failed" },
];

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [successFilter, setSuccessFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "150" });
      if (successFilter) params.set("success", successFilter);
      const payload = await apiFetch(`/auth/audit-logs?${params.toString()}`);
      setLogs(Array.isArray(payload?.data) ? payload.data : []);
    } catch (err) {
      setError(err?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [successFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const summary = useMemo(() => {
    const successful = logs.filter((row) => row.success).length;
    return {
      total: logs.length,
      successful,
      failed: logs.length - successful,
    };
  }, [logs]);

  if (user?.role !== "OWNER") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md border border-stone-200 bg-white p-6">
          <ShieldAlert className="h-6 w-6 text-blue-700" strokeWidth={1.8} />
          <h1
            className="mt-4 text-lg font-black uppercase tracking-tight text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Owner Access Only
          </h1>
          <p className="mt-2 text-sm text-black/55">
            Login audit records are available to the account owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">- Security -</p>
          <h1
            className="mt-1 text-lg font-black uppercase tracking-tight text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-black/55">
            Login activity for owners and assigned team members.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 border border-blue-700 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            strokeWidth={1.8}
          />
          Refresh
        </button>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <SummaryTile
          label="Total"
          value={summary.total}
          detail="All logins"
          icon={Clock}
        />
        <SummaryTile
          label="Success"
          value={summary.successful}
          detail="Allowed"
          icon={CheckCircle2}
        />
        <SummaryTile
          label="Failed"
          value={summary.failed}
          detail="Blocked"
          icon={AlertCircle}
        />
      </section>

      <div className="flex flex-col gap-2 border border-stone-200 bg-white p-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-full border border-stone-200 sm:w-auto">
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setSuccessFilter(filter.value)}
              className={`min-h-8 flex-1 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] sm:flex-none ${
                successFilter === filter.value
                  ? "bg-blue-700 text-white"
                  : "bg-white text-black/55 hover:bg-stone-50 hover:text-black"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/45">
          Showing {logs.length} records
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 border-l-2 border-blue-700 bg-stone-50 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 text-blue-700" strokeWidth={1.8} />
          <p className="text-sm font-semibold text-black">{error}</p>
        </div>
      )}

      <div className="overflow-hidden border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-stone-200 text-left">
            <thead className="bg-stone-50">
              <tr>
                <TableHead className="w-36">Time</TableHead>
                <TableHead className="w-56">User</TableHead>
                <TableHead className="w-28">Result</TableHead>
                <TableHead className="w-24">Role</TableHead>
                <TableHead className="w-36">IP</TableHead>
                <TableHead>Device</TableHead>
                <TableHead className="w-20 text-right">More</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {loading ? (
                <LoadingRows />
              ) : logs.length ? (
                logs.map((row) => (
                  <AuditRow
                    key={row.id}
                    row={row}
                    onView={() => setSelectedLog(row)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-black/45">
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AuditLogDetails
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}

function SummaryTile({ label, value, detail, icon: Icon }) {
  return (
    <div className="border border-stone-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[9px] font-bold uppercase tracking-[0.16em] text-black/45">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 flex-shrink-0 text-blue-700" strokeWidth={1.8} />
      </div>
      <p
        className="mt-2 text-xl font-black tracking-tight text-black"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">
        {detail}
      </p>
    </div>
  );
}

function TableHead({ children, className = "" }) {
  return (
    <th
      className={`px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-black/45 ${className}`}
    >
      {children}
    </th>
  );
}

function AuditRow({ row, onView }) {
  return (
    <tr className="hover:bg-stone-50">
      <td className="whitespace-nowrap px-3 py-2 text-xs text-black">
        {formatCompactDate(row.created_at)}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-start gap-2">
          <UserRound className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-black/35" strokeWidth={1.8} />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-black">{row.name || row.email}</p>
            {row.name && <p className="truncate text-[11px] text-black/50">{row.email}</p>}
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <span
          className={`inline-flex max-w-full items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
            row.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          <span className="truncate">{row.success ? "Success" : row.reason || "Failed"}</span>
        </span>
      </td>
      <td className="truncate whitespace-nowrap px-3 py-2 text-xs text-black/65">
        {row.role || "-"}
      </td>
      <td className="truncate whitespace-nowrap px-3 py-2 font-mono text-[11px] text-black/60">
        {row.ip || "-"}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-start gap-2">
          <Monitor className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-black/35" strokeWidth={1.8} />
          <p className="truncate text-[11px] leading-relaxed text-black/55">
            {row.user_agent || "-"}
          </p>
        </div>
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={onView}
          className="inline-flex h-8 w-8 items-center justify-center border border-stone-200 text-blue-700 transition-colors hover:bg-blue-50"
          aria-label="View audit log details"
          title="View details"
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </td>
    </tr>
  );
}

function LoadingRows() {
  return Array.from({ length: 6 }).map((_, index) => (
    <tr key={index}>
      {Array.from({ length: 7 }).map((__, cell) => (
        <td key={cell} className="px-3 py-2">
          <div className="h-3 w-full max-w-28 animate-pulse bg-stone-200" />
        </td>
      ))}
    </tr>
  ));
}

function AuditLogDetails({ log, onClose }) {
  if (!log) return null;

  const details = [
    ["Name", log.name || "-"],
    ["Email", log.email || "-"],
    ["Event", log.event || "-"],
    ["Result", log.success ? "Success" : "Failed"],
    ["Reason", log.reason || (log.success ? "Authenticated" : "-")],
    ["Role", log.role || "-"],
    ["IP Address", log.ip || "-"],
    ["Date", formatDate(log.created_at)],
    ["User Agent", log.user_agent || "-"],
  ];

  return (
    <ModalSlider isOpen={!!log} onClose={onClose} title="Audit Log Details">
      <div className="space-y-5">
        <div className="border border-stone-200 bg-stone-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">
            Login Record
          </p>
          <h2
            className="mt-2 break-words text-xl font-black tracking-tight text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {log.name || log.email || "Unknown user"}
          </h2>
          <span
            className={`mt-3 inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
              log.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {log.success ? "Successful Login" : "Failed Login"}
          </span>
        </div>

        <div className="divide-y divide-stone-200 border border-stone-200 bg-white">
          {details.map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">
                {label}
              </p>
              <p className="break-words text-sm font-semibold leading-relaxed text-black/75">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ModalSlider>
  );
}

function formatCompactDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
