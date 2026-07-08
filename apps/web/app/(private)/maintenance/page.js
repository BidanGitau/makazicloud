"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams, usePathname } from "@/app/_hooks/navigation";
import DataTable from "react-data-table-component";
import { ChevronDown, Plus } from "lucide-react";
import { Maintenance } from "@/app/_lib/repositories";
import { useFormData } from "@/app/_hooks/useFormData";
import ModalSlider from "@/app/_components/ModalSlider";
import { showToast } from "@/app/_components/CustomToast";
import { formatCurrency } from "@/app/_lib/formatters";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import {
  buildMaintenanceColumns,
  maintenanceTableStyles,
} from "./MaintenanceColumns";
import MaintenanceForm from "./MaintenanceForm";
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
  const [expandedProperties, setExpandedProperties] = useState(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState(new Set());
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
    if (status === "completed" && Number(row?.actual_cost || 0) <= 0) {
      showToast.error("Add the maintenance cost before marking completed.");
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

  const nestedRequestColumns = useMemo(
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
        showProperty: false,
      }),
    [canDelete, canEdit, handleDelete, handleStatusChange],
  );

  const maintenanceTree = useMemo(() => {
    return properties
      .map((property) => {
        const propertyRequests = filteredRequests.filter(
          (request) => request.property_id === property.id,
        );
        const blocksById = new Map();
        const directRequests = [];

        propertyRequests.forEach((request) => {
          if (!request.block_id) {
            directRequests.push(request);
            return;
          }
          if (!blocksById.has(request.block_id)) {
            blocksById.set(request.block_id, {
              id: request.block_id,
              name: request.block_name || "Block",
              requests: [],
            });
          }
          blocksById.get(request.block_id).requests.push(request);
        });

        const blocks = [...blocksById.values()].map((block) => ({
          ...block,
          request_count: block.requests.length,
          open_count: block.requests.filter(
            (request) => request.status !== "completed",
          ).length,
          total_cost: block.requests.reduce(
            (sum, request) =>
              sum + Number(request.actual_cost ?? request.estimated_cost ?? 0),
            0,
          ),
        }));

        return {
          ...property,
          requests: directRequests,
          blocks,
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

  const requestSummaryRows = (rows) => {
    if (!rows.length) return rows;
    return [
      ...rows,
      {
        isSummary: true,
        id: `summary-${rows.map((row) => row.id).join("-")}`,
        title: "Total",
        actual_cost: rows.reduce(
          (sum, row) => sum + Number(row.actual_cost ?? row.estimated_cost ?? 0),
          0,
        ),
        status: "",
      },
    ];
  };

  const nestedRequestTable = (rows) => (
    <DataTable
      columns={nestedRequestColumns}
      data={requestSummaryRows(rows)}
      customStyles={maintenanceTableStyles}
      noDataComponent={<NoMaintenanceMessage />}
      responsive
      striped
      highlightOnHover
      conditionalRowStyles={[
        {
          when: (row) => row.isSummary,
          style: {
            fontWeight: 600,
            backgroundColor: "#f5f5f4",
            borderTop: "1px solid #e7e5e4",
          },
        },
      ]}
    />
  );

  if ((loading || isLoadingFormData) && requests.length === 0) {
    return <PageSkeleton cards={6} hasFilters />;
  }

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">— Operations —</p>
          <h1
            className="mt-1 text-lg font-black uppercase tracking-tight text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Maintenance
          </h1>
          <p className="mt-1 text-sm text-black/55">
            Track repair requests across all properties.
          </p>
        </div>
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

      <div className="space-y-1">
        {maintenanceTree.length === 0 ? (
          <NoMaintenanceMessage hasFilters={hasFilters} />
        ) : (
          maintenanceTree.map((property) => {
            const propertyOpen = expandedProperties.has(property.id);
            return (
              <section key={property.id} className="border border-stone-200 bg-white">
                <button
                  type="button"
                  onClick={() => toggleSetItem(setExpandedProperties, property.id)}
                  className="grid w-full gap-px border-b border-stone-200 bg-stone-200 text-left transition-colors hover:bg-stone-300 sm:grid-cols-[minmax(0,2fr)_100px_100px_140px]"
                  aria-expanded={propertyOpen}
                >
                  <div className="flex items-center gap-2 bg-white px-2 py-1.5">
                    <ChevronDown
                      className={`h-3 w-3 text-black/55 transition-transform ${
                        propertyOpen ? "rotate-0" : "-rotate-90"
                      }`}
                      strokeWidth={2}
                    />
                    <p className="min-w-0 flex-1 truncate text-xs font-black text-black">
                      {property.name}
                    </p>
                  </div>
                  <Metric label="Requests" value={property.request_count} />
                  <Metric label="Open" value={property.open_count} />
                  <Metric label="Cost" value={formatCurrency(property.total_cost)} />
                </button>

                {propertyOpen && (
                  <div className="space-y-1 bg-stone-50 p-1.5">
                    {property.blocks.map((block) => {
                      const blockKey = `${property.id}:${block.id}`;
                      const blockOpen = expandedBlocks.has(blockKey);
                      return (
                        <div key={blockKey} className="border border-stone-200 bg-white">
                          <button
                            type="button"
                            onClick={() => toggleSetItem(setExpandedBlocks, blockKey)}
                            className="grid w-full gap-px border-b border-stone-200 bg-stone-200 text-left transition-colors hover:bg-stone-300 sm:grid-cols-[minmax(0,2fr)_100px_100px_140px]"
                            aria-expanded={blockOpen}
                          >
                            <div className="flex min-w-0 items-center gap-2 bg-white px-2 py-1.5">
                              <ChevronDown
                                className={`h-3 w-3 text-black/55 transition-transform ${
                                  blockOpen ? "rotate-0" : "-rotate-90"
                                }`}
                                strokeWidth={2}
                              />
                              <p className="truncate text-xs font-semibold text-black">{block.name}</p>
                            </div>
                            <Metric label="Requests" value={block.request_count} />
                            <Metric label="Open" value={block.open_count} />
                            <Metric label="Cost" value={formatCurrency(block.total_cost)} />
                          </button>
                          {blockOpen && nestedRequestTable(block.requests || [])}
                        </div>
                      );
                    })}

                    {property.requests?.length > 0 && (
                      <div className="border border-stone-200 bg-white">
                        <div className="border-b border-stone-200 px-2 py-1.5">
                          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                            Property Maintenance
                          </p>
                        </div>
                        {nestedRequestTable(property.requests)}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })
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

    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-white px-2 py-1.5">
      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
        {label}
      </p>
      <p className="text-xs font-black tabular-nums text-black">{value}</p>
    </div>
  );
}

function toggleSetItem(setter, item) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  });
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
