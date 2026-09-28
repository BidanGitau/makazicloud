"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams, usePathname } from "@/app/_hooks/navigation";
import { Plus } from "lucide-react";
import { Maintenance } from "@/app/_lib/repositories";
import { useFormData } from "@/app/_hooks/useFormData";
import ModalSlider from "@/app/_components/ModalSlider";
import { showToast } from "@/app/_components/CustomToast";
import { formatCurrency } from "@/app/_lib/formatters";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import MaintenanceForm from "./MaintenanceForm";
import MaintenanceSummary from "./MaintenanceSummary";
import { CATEGORIES, STATUSES } from "./maintenanceConstants";
import { useAuth } from "@/app/_context/AuthContext";

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
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [filters, setFilters] = useState(FILTER_INIT);
  const canOpenRequestModal =
    (activeModal === "add_request" && canCreate) ||
    (activeModal === "edit_request" && canEdit);

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
      const reqs = await Maintenance.getWithDetails();
      setRequests(reqs);
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
    return {
      total: filteredRequests.length,
      pending,
      inProgress,
      completed,
      totalCost,
    };
  }, [filteredRequests]);

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

  const handleStatusChange = useCallback(async (id, status, row) => {
    if (Number(row?.actual_cost || 0) <= 0) {
      showToast.error("Add the maintenance cost first.");
      return;
    }

    try {
      await Maintenance.update(id, { status });
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch {
      showToast.error("Failed to update status.");
    }
  }, []);

  const maintenanceTree = useMemo(() => {
    return properties
      .map((property) => {
        const propertyRequests = filteredRequests.filter(
          (request) => request.property_id === property.id,
        );
        const blocksById = new Map();
        const unitsByKey = new Map();
        const otherRequests = [];

        const requestUnitNumber = (request) =>
          request.unit_number || request.units?.unit_number || "";
        const requestTenantName = (request) =>
          request.tenant_name || request.tenants?.full_name || "";

        const summarizeRequests = (requests) => ({
          requests,
          request_count: requests.length,
          open_count: requests.filter((request) => request.status !== "completed").length,
          total_cost: requests.reduce(
            (sum, request) =>
              sum + Number(request.actual_cost ?? request.estimated_cost ?? 0),
            0,
          ),
        });

        propertyRequests.forEach((request) => {
          if (request.block_id) {
            if (!blocksById.has(request.block_id)) {
              blocksById.set(request.block_id, {
                id: request.block_id,
                name: request.block_name || "Block",
                requests: [],
              });
            }
            blocksById.get(request.block_id).requests.push(request);
            return;
          }

          const unitNumber = requestUnitNumber(request);
          const unitKey = request.unit_id || unitNumber;
          if (unitKey) {
            if (!unitsByKey.has(unitKey)) {
              unitsByKey.set(unitKey, {
                id: unitKey,
                name: unitNumber ? `#${unitNumber}` : "Unit",
                tenant_name: requestTenantName(request),
                requests: [],
              });
            }
            const unitGroup = unitsByKey.get(unitKey);
            if (!unitGroup.tenant_name) {
              unitGroup.tenant_name = requestTenantName(request);
            }
            unitGroup.requests.push(request);
            return;
          }

          otherRequests.push(request);
        });

        const blocks = [...blocksById.values()].map((block) => ({
          ...block,
          ...summarizeRequests(block.requests),
        }));

        const units = [...unitsByKey.values()]
          .map((unit) => ({
            ...unit,
            ...summarizeRequests(unit.requests),
          }))
          .sort((a, b) =>
            String(a.name).localeCompare(String(b.name), undefined, { numeric: true }),
          );

        return {
          ...property,
          blocks,
          units,
          requests: otherRequests,
          request_count: propertyRequests.length,
          open_count: propertyRequests.filter(
            (request) => request.status !== "completed",
          ).length,
          total_cost: propertyRequests.reduce(
            (sum, request) =>
              sum + Number(request.actual_cost ?? request.estimated_cost ?? 0),
            0,
          ),
        };
      })
      .filter((property) => property.request_count > 0);
  }, [filteredRequests, properties]);

  const hasFilters = Object.values(filters).some(Boolean);

  if ((loading || isLoadingFormData) && requests.length === 0) {
    return <PageSkeleton cards={6} hasFilters />;
  }

  return (
    <div className="space-y-2 p-1 sm:p-2">
      <header className="flex justify-end">
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={() => setActiveModal("add_request")}
              className="inline-flex items-center gap-1.5 bg-blue-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-blue-800"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
              Add Request
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 md:grid-cols-5">
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
      </div>

      <div className="border border-stone-200 bg-white p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <select
            value={filters.property}
            onChange={(e) =>
              setFilters((f) => ({ ...f, property: e.target.value }))
            }
            className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
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
            className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
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
            className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
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

      {maintenanceTree.length === 0 ? (
        <NoMaintenanceMessage hasFilters={hasFilters} />
      ) : (
        <MaintenanceSummary
          rows={maintenanceTree}
          onEdit={
            canEdit
              ? (row) => {
                  setEditTarget(row);
                  setActiveModal("edit_request");
                }
              : null
          }
          onDelete={canDelete ? handleDelete : null}
          onStatusChange={canEdit ? handleStatusChange : null}
        />
      )}

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

    </div>
  );
}

function NoMaintenanceMessage({ hasFilters = false }) {
  return (
    <div className="py-10 text-center text-gray-500 text-sm">
      No maintenance requests found
      {hasFilters ? " for the selected filters" : ""}.
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
