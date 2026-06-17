"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams, usePathname } from "@/app/_hooks/navigation";
import DataTable from "react-data-table-component";
import { Plus } from "lucide-react";
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

  const BlockExpandable = ({ data }) => (
    <div className="border-t border-stone-200 bg-stone-50 px-4 py-3">
      <p className="section-label mb-3">— Maintenance in {data.name} —</p>
      {nestedRequestTable(data.requests || [])}
    </div>
  );

  const PropertyExpandable = ({ data }) => (
    <div className="border-t border-stone-200 bg-stone-50 px-4 py-3">
      {data.blocks?.length > 0 ? (
        <>
          <p className="section-label mb-3">— Blocks in {data.name} —</p>
          <DataTable
            customStyles={maintenanceTableStyles}
            columns={blockColumns}
            data={data.blocks}
            expandableRows
            expandableRowsComponent={BlockExpandable}
            highlightOnHover
            striped
            responsive
          />
          {data.requests?.length > 0 && (
            <div className="mt-4 border-t border-stone-200 bg-white pt-4">
              <p className="section-label mb-3">— Property maintenance —</p>
              {nestedRequestTable(data.requests)}
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="section-label mb-3">— Maintenance in {data.name} —</p>
          {nestedRequestTable(data.requests || [])}
        </div>
      )}
    </div>
  );

  const propertyColumns = [
    {
      name: "Property",
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => (
        <div className="py-2">
          <p className="font-semibold text-black">{row.name}</p>
          <p className="text-sm text-black/55">
            {row.request_count} requests · {row.open_count} open
          </p>
        </div>
      ),
      grow: 3,
    },
    {
      name: "Cost",
      selector: (row) => Number(row.total_cost || 0),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-mono font-semibold tabular-nums text-black">
          {formatCurrency(row.total_cost)}
        </span>
      ),
      width: "160px",
    },
  ];

  const blockColumns = [
    {
      name: "Block",
      selector: (row) => row.name,
      sortable: true,
      cell: (row) => (
        <div className="py-2">
          <p className="font-semibold text-black">{row.name}</p>
          <p className="text-sm text-black/55">
            {row.request_count} requests · {row.open_count} open
          </p>
        </div>
      ),
      grow: 3,
    },
    {
      name: "Cost",
      selector: (row) => Number(row.total_cost || 0),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-mono font-semibold tabular-nums text-black">
          {formatCurrency(row.total_cost)}
        </span>
      ),
      width: "160px",
    },
  ];

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
            Track repair requests across all properties.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={() => setActiveModal("add_request")}
              className="inline-flex items-center gap-2 bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
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

      <div>
        <DataTable
          columns={propertyColumns}
          data={maintenanceTree}
          customStyles={maintenanceTableStyles}
          pagination
          progressPending={loading}
          noDataComponent={
            <NoMaintenanceMessage hasFilters={hasFilters} />
          }
          responsive
          striped
          highlightOnHover
          expandableRows
          expandableRowsComponent={PropertyExpandable}
        />
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
