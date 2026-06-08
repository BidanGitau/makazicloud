"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams, usePathname } from "@/app/_hooks/navigation";
import DataTable from "react-data-table-component";
import { Plus, Wrench, Wallet } from "lucide-react";
import { Maintenance, OwnerAdvances } from "@/app/_lib/repositories";
import { useFormData } from "@/app/_hooks/useFormData";
import ModalSlider from "@/app/_components/ModalSlider";
import { showToast } from "@/app/_components/CustomToast";
import { formatCurrency } from "@/app/_lib/formatters";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import {
  buildMaintenanceColumns,
  buildAdvanceColumns,
  maintenanceTableStyles,
} from "./MaintenanceColumns";
import MaintenanceForm from "./MaintenanceForm";
import AdvanceForm from "./AdvanceForm";
import { CATEGORIES, STATUSES, ADVANCE_STATUSES } from "./maintenanceConstants";
import { useAuth } from "@/app/_context/AuthContext";

const TABS = [
  { id: "requests", label: "Requests", Icon: Wrench },
  { id: "advances", label: "Owner Advances", Icon: Wallet },
];

const FILTER_INIT = { property: "", status: "", category: "" };

export default function MaintenancePage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { permissions } = useAuth();
  const permissionSet = useMemo(() => new Set(permissions || []), [permissions]);
  const canCreate = permissionSet.has("maintenance:create");
  const canEdit = permissionSet.has("maintenance:edit");
  const canDelete = permissionSet.has("maintenance:delete");
  const handledNewParam = useRef(false);
  const [tab, setTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [filters, setFilters] = useState(FILTER_INIT);
  const canOpenRequestModal =
    (activeModal === "add_request" && canCreate) ||
    (activeModal === "edit_request" && canEdit);
  const canOpenAdvanceModal =
    (activeModal === "add_advance" && canCreate) ||
    (activeModal === "edit_advance" && canEdit);

  useEffect(() => {
    if (searchParams.get("new") === "true" && !handledNewParam.current) {
      handledNewParam.current = true;
      if (canCreate) setActiveModal("add_request");
      window.history.replaceState(window.history.state, "", pathname);
    }
  }, [canCreate, pathname, searchParams]);

  const { properties, isLoading: isLoadingFormData } = useFormData({
    includeBlocks: false,
    includeUnits: false,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, advs] = await Promise.all([
        Maintenance.getWithDetails(),
        OwnerAdvances.getWithDetails(),
      ]);
      setRequests(reqs);
      setAdvances(advs);
    } catch (err) {
      console.error(err);
      showToast.error("Failed to load maintenance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredRequests = useMemo(
    () =>
      requests.filter((r) => {
        if (filters.property && r.property_id !== filters.property)
          return false;
        if (filters.status && r.status !== filters.status) return false;
        if (filters.category && r.category !== filters.category) return false;
        return true;
      }),
    [requests, filters],
  );

  const filteredAdvances = useMemo(
    () =>
      filters.property
        ? advances.filter((a) => a.property_id === filters.property)
        : advances,
    [advances, filters.property],
  );

  const stats = useMemo(() => {
    const pending = filteredRequests.filter(
      (r) => r.status === "pending",
    ).length;
    const inProgress = filteredRequests.filter(
      (r) => r.status === "in_progress",
    ).length;
    const completed = filteredRequests.filter(
      (r) => r.status === "completed",
    ).length;
    const totalCost = filteredRequests.reduce(
      (s, r) => s + Number(r.actual_cost ?? r.estimated_cost ?? 0),
      0,
    );
    const totalAdvances = filteredAdvances.reduce(
      (s, a) => s + Number(a.amount || 0),
      0,
    );
    return {
      total: filteredRequests.length,
      pending,
      inProgress,
      completed,
      totalCost,
      totalAdvances,
    };
  }, [filteredRequests, filteredAdvances]);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setEditTarget(null);
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      if (!confirm("Delete this maintenance request?")) return;
      try {
        await Maintenance.remove(id);
        showToast.success("Request deleted.");
        fetchAll();
      } catch {
        showToast.error("Failed to delete.");
      }
    },
    [fetchAll],
  );

  const handleStatusChange = useCallback(async (id, status) => {
    try {
      await Maintenance.update(id, { status });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch {
      showToast.error("Failed to update status.");
    }
  }, []);

  const handleDeleteAdvance = useCallback(
    async (id) => {
      if (!confirm("Delete this advance?")) return;
      try {
        await OwnerAdvances.remove(id);
        showToast.success("Advance deleted.");
        fetchAll();
      } catch {
        showToast.error("Failed to delete.");
      }
    },
    [fetchAll],
  );

  const requestColumns = useMemo(
    () =>
      buildMaintenanceColumns({
        onEdit: canEdit
          ? (row) => {
              setEditTarget(row);
              setActiveModal("edit_request");
            }
          : null,
        onDelete: canDelete ? handleDelete : null,
        onStatusChange: canEdit ? handleStatusChange : null,
      }),
    [canDelete, canEdit, handleDelete, handleStatusChange],
  );

  const advanceColumns = useMemo(
    () =>
      buildAdvanceColumns({
        onEdit: canEdit
          ? (row) => {
              setEditTarget(row);
              setActiveModal("edit_advance");
            }
          : null,
        onDelete: canDelete ? handleDeleteAdvance : null,
      }),
    [canDelete, canEdit, handleDeleteAdvance],
  );

  const hasFilters = Object.values(filters).some(Boolean);

  if ((loading || isLoadingFormData) && requests.length === 0) {
    return <PageSkeleton cards={6} hasFilters />;
  }

  return (
    <div className="space-y-5 p-3 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">— Operations —</p>
          <h1
            className="mt-2 text-2xl font-black uppercase tracking-tight text-black sm:text-base"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Maintenance
          </h1>
          <p className="mt-1 text-sm text-black/55">
            Track repair requests and owner advances across all properties.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <>
              <button
                type="button"
                onClick={() => setActiveModal("add_advance")}
                className="inline-flex items-center gap-2 border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                Add Advance
              </button>
              <button
                type="button"
                onClick={() => setActiveModal("add_request")}
                className="inline-flex items-center gap-2 bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                Add Request
              </button>
            </>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total" value={stats.total} accent="text-black" />
        <StatCard
          label="Pending"
          value={stats.pending}
          accent="text-yellow-700"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress}
          accent="text-blue-700"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          accent="text-green-700"
        />
        <StatCard
          label="Total Cost"
          value={formatCurrency(stats.totalCost)}
          accent="text-red-600"
        />
        <StatCard
          label="Total Advances"
          value={formatCurrency(stats.totalAdvances)}
          accent="text-amber-700"
        />
      </div>

      <div className="border border-stone-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            value={filters.property}
            onChange={(e) =>
              setFilters((f) => ({ ...f, property: e.target.value }))
            }
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value }))
            }
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={(e) =>
              setFilters((f) => ({ ...f, category: e.target.value }))
            }
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={() => setFilters(FILTER_INIT)}
              className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="flex border border-stone-300 text-[11px] font-bold uppercase tracking-[0.18em] w-fit">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-5 py-2 transition-colors ${
              tab === id
                ? "bg-blue-700 text-white"
                : "bg-white text-black/55 hover:bg-stone-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        {tab === "requests" ? (
          <DataTable
            columns={requestColumns}
            data={filteredRequests}
            customStyles={maintenanceTableStyles}
            pagination
            progressPending={loading}
            noDataComponent={
              <div className="py-10 text-center text-gray-500 text-sm">
                No maintenance requests found
                {hasFilters ? " for the selected filters" : ""}.
              </div>
            }
            responsive
            striped
            highlightOnHover
          />
        ) : (
          <DataTable
            columns={advanceColumns}
            data={filteredAdvances}
            customStyles={maintenanceTableStyles}
            pagination
            progressPending={loading}
            noDataComponent={
              <div className="py-10 text-center text-gray-500 text-sm">
                No owner advances found
                {filters.property ? " for this property" : ""}.
              </div>
            }
            responsive
            striped
            highlightOnHover
          />
        )}
      </div>

      <ModalSlider
        isOpen={canOpenRequestModal}
        onClose={closeModal}
        title={
          activeModal === "edit_request"
            ? "Edit Maintenance Request"
            : "Add Maintenance Request"
        }
      >
        <MaintenanceForm
          key={editTarget?.id ?? "new_request"}
          initialData={activeModal === "edit_request" ? editTarget : null}
          onSuccess={() => {
            closeModal();
            showToast.success(
              editTarget ? "Request updated." : "Request added.",
            );
            fetchAll();
          }}
        />
      </ModalSlider>

      <ModalSlider
        isOpen={canOpenAdvanceModal}
        onClose={closeModal}
        title={
          activeModal === "edit_advance"
            ? "Edit Owner Advance"
            : "Add Owner Advance"
        }
      >
        <AdvanceForm
          key={editTarget?.id ?? "new_advance"}
          initialData={activeModal === "edit_advance" ? editTarget : null}
          onSuccess={() => {
            closeModal();
            showToast.success(
              editTarget ? "Advance updated." : "Advance added.",
            );
            fetchAll();
          }}
        />
      </ModalSlider>
    </div>
  );
}

function StatCard({ label, value, accent = "text-black" }) {
  return (
    <div className="bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-black tabular-nums ${accent}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}
