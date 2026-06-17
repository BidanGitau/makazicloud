"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import DataTable from "react-data-table-component";
import { Plus, Filter } from "lucide-react";
import { UtilityBills, Properties } from "@/app/_lib/repositories";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import ModalSlider from "@/app/_components/ModalSlider";
import BillForm from "./BillForm";
import { buildBillColumns, billTableStyles } from "./BillColumns";
import { showToast } from "@/app/_components/CustomToast";
import { useAuth } from "@/app/_context/AuthContext";

const FILTER_INIT = { property: "", block: "", unit: "", month: "" };

export default function UtilityPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("utilities:manage");
  const [bills, setBills] = useState([]);
  const [fullProperties, setFullProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [filters, setFilters] = useState(FILTER_INIT);

  const setFilter = useCallback(
    (key, value) => setFilters((f) => ({ ...f, [key]: value })),
    [],
  );

  const {
    propertyBlocks: filterBlocks,
    propertyUnits: filterUnits,
    allUnits,
    isLoading: isLoadingFormData,
  } = usePropertyStructure(filters.property, filters.block);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allBills, allProperties] = await Promise.all([
        UtilityBills.getAllWithDetails(),
        Properties.getAll({ select: "id,name,recurring_bills" }),
      ]);
      setBills(allBills || []);
      setFullProperties(allProperties || []);
    } catch (err) {
      console.error("Failed to fetch utility bills:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (filters.property && b.property_id !== filters.property) return false;
      if (filters.block && b.block_id !== filters.block) return false;
      if (filters.unit && b.unit_id !== filters.unit) return false;
      if (filters.month && !b.billing_month?.startsWith(filters.month))
        return false;
      return true;
    });
  }, [bills, filters]);

  const stats = useMemo(() => {
    const total = filteredBills.reduce(
      (s, b) => s + Number(b.total_amount || 0),
      0,
    );
    const paid = filteredBills.reduce(
      (s, b) => s + Number(b.paid_amount || 0),
      0,
    );
    const pending = filteredBills.filter((b) => b.status !== "paid").length;
    return { total, paid, pending, count: filteredBills.length };
  }, [filteredBills]);

  const handleMarkPaid = useCallback(
    async (bill) => {
      try {
        await UtilityBills.update(bill.id, {
          status: "paid",
          paid_amount: bill.total_amount,
          payment_date: new Date().toISOString().split("T")[0],
        });
        showToast.success("Bill marked as paid.");
        fetchData();
      } catch (err) {
        showToast.error("Failed to update bill.");
        console.error(err);
      }
    },
    [fetchData],
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!confirm("Delete this bill?")) return;
      try {
        await UtilityBills.remove(id);
        showToast.success("Bill deleted.");
        fetchData();
      } catch (err) {
        showToast.error("Failed to delete bill.");
        console.error(err);
      }
    },
    [fetchData],
  );

  const nestedBillColumns = useMemo(
    () =>
      buildBillColumns({
        onMarkPaid: canManage ? handleMarkPaid : null,
        onDelete: canManage ? handleDelete : null,
        showPropertyUnit: false,
      }),
    [canManage, handleMarkPaid, handleDelete],
  );

  const utilityTree = useMemo(() => {
    return fullProperties
      .map((property) => {
        const propertyBills = filteredBills.filter(
          (bill) => bill.property_id === property.id,
        );
        const blocksById = new Map();
        const directBills = [];

        propertyBills.forEach((bill) => {
          if (!bill.block_id) {
            directBills.push(bill);
            return;
          }
          if (!blocksById.has(bill.block_id)) {
            blocksById.set(bill.block_id, {
              id: bill.block_id,
              name: bill.block_name || "Block",
              bills: [],
            });
          }
          blocksById.get(bill.block_id).bills.push(bill);
        });

        const blocks = [...blocksById.values()].map((block) => ({
          ...block,
          bill_count: block.bills.length,
          total_amount: block.bills.reduce(
            (sum, bill) => sum + Number(bill.total_amount || 0),
            0,
          ),
          pending_count: block.bills.filter((bill) => bill.status !== "paid").length,
        }));

        return {
          ...property,
          bills: directBills,
          blocks,
          bill_count: propertyBills.length,
          total_amount: propertyBills.reduce(
            (sum, bill) => sum + Number(bill.total_amount || 0),
            0,
          ),
          paid_amount: propertyBills.reduce(
            (sum, bill) => sum + Number(bill.paid_amount || 0),
            0,
          ),
          pending_count: propertyBills.filter((bill) => bill.status !== "paid").length,
        };
      })
      .filter((property) => property.bill_count > 0);
  }, [filteredBills, fullProperties]);

  const hasFilters = Object.values(filters).some(Boolean);

  const billSummaryRow = (bills) => {
    if (!bills.length) return bills;
    return [
      ...bills,
      {
        isSummary: true,
        id: `summary-${bills.map((bill) => bill.id).join("-")}`,
        name: "Total",
        total_amount: bills.reduce(
          (sum, bill) => sum + Number(bill.total_amount || 0),
          0,
        ),
        paid_amount: bills.reduce(
          (sum, bill) => sum + Number(bill.paid_amount || 0),
          0,
        ),
        status: "",
      },
    ];
  };

  const nestedBillTable = (rows) => (
    <DataTable
      columns={nestedBillColumns}
      data={billSummaryRow(rows)}
      customStyles={billTableStyles}
      highlightOnHover
      striped
      responsive
      noDataComponent={<NoUtilityBillsMessage />}
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
      <p className="section-label mb-3">— Utility bills in {data.name} —</p>
      {nestedBillTable(data.bills || [])}
    </div>
  );

  const PropertyExpandable = ({ data }) => (
    <div className="border-t border-stone-200 bg-stone-50 px-4 py-3">
      {data.blocks?.length > 0 ? (
        <>
          <p className="section-label mb-3">— Blocks in {data.name} —</p>
          <DataTable
            customStyles={billTableStyles}
            columns={blockColumns}
            data={data.blocks}
            expandableRows
            expandableRowsComponent={BlockExpandable}
            highlightOnHover
            striped
            responsive
          />
          {data.bills?.length > 0 && (
            <div className="mt-4 border-t border-stone-200 bg-white pt-4">
              <p className="section-label mb-3">— Property utility bills —</p>
              {nestedBillTable(data.bills)}
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="section-label mb-3">— Utility bills in {data.name} —</p>
          {nestedBillTable(data.bills || [])}
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
            {row.bill_count} bills · {row.pending_count} pending
          </p>
        </div>
      ),
      grow: 3,
    },
    {
      name: "Total",
      selector: (row) => Number(row.total_amount || 0),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-mono font-semibold tabular-nums text-black">
          KSh {Number(row.total_amount || 0).toLocaleString("en-KE")}
        </span>
      ),
      width: "160px",
    },
    {
      name: "Paid",
      selector: (row) => Number(row.paid_amount || 0),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-mono font-semibold tabular-nums text-black/65">
          KSh {Number(row.paid_amount || 0).toLocaleString("en-KE")}
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
            {row.bill_count} bills · {row.pending_count} pending
          </p>
        </div>
      ),
      grow: 3,
    },
    {
      name: "Total",
      selector: (row) => Number(row.total_amount || 0),
      sortable: true,
      right: true,
      cell: (row) => (
        <span className="font-mono font-semibold tabular-nums text-black">
          KSh {Number(row.total_amount || 0).toLocaleString("en-KE")}
        </span>
      ),
      width: "160px",
    },
  ];

  if (loading || isLoadingFormData) {
    return (
      <div className="p-6">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
      </div>
    );
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
            Utilities
          </h1>
          <p className="mt-1 text-sm text-black/55">
            Record utility bills against units. Track billed vs collected per
            property.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setActiveModal("bill")}
            className="inline-flex items-center gap-2 bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
            Add Bill
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 md:grid-cols-4">
        <StatCard label="Total Bills" value={String(stats.count)} />
        <StatCard
          label="Total Amount"
          value={`KSh ${stats.total.toLocaleString("en-KE")}`}
          accent="text-blue-700"
        />
        <StatCard
          label="Total Paid"
          value={`KSh ${stats.paid.toLocaleString("en-KE")}`}
          accent="text-green-700"
        />
        <StatCard
          label="Pending"
          value={String(stats.pending)}
          accent="text-amber-700"
        />
      </div>

      <div className="border border-stone-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
          <Filter className="h-3.5 w-3.5" strokeWidth={1.8} /> Filters
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <select
            value={filters.property}
            onChange={(e) =>
              setFilters({ ...FILTER_INIT, property: e.target.value })
            }
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          >
            <option value="">All Properties</option>
            {fullProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={filters.block}
            onChange={(e) =>
              setFilters((f) => ({ ...f, block: e.target.value, unit: "" }))
            }
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-black/40"
            disabled={!filters.property || filterBlocks.length === 0}
          >
            <option value="">All Blocks</option>
            {filterBlocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={filters.unit}
            onChange={(e) => setFilter("unit", e.target.value)}
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-black/40"
            disabled={!filters.property || filterUnits.length === 0}
          >
            <option value="">All Units</option>
            {filterUnits.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.unit_number}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={filters.month}
            onChange={(e) => setFilter("month", e.target.value)}
            className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => setFilters(FILTER_INIT)}
            className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 hover:text-blue-800"
          >
            Clear filters
          </button>
        )}
      </div>

      <div>
        <DataTable
          columns={propertyColumns}
          data={utilityTree}
          customStyles={billTableStyles}
          pagination
          highlightOnHover
          striped
          responsive
          expandableRows
          expandableRowsComponent={PropertyExpandable}
          noDataComponent={
            <NoUtilityBillsMessage hasFilters={hasFilters} />
          }
        />
      </div>

      <ModalSlider
        isOpen={activeModal === "bill"}
        onClose={() => setActiveModal(null)}
        title="Add Utility Bill"
      >
        <BillForm
          properties={fullProperties}
          onSuccess={() => {
            setActiveModal(null);
            showToast.success("Bill added successfully.");
            fetchData();
          }}
        />
      </ModalSlider>
    </div>
  );
}

function NoUtilityBillsMessage({ hasFilters = false }) {
  return (
    <div className="py-10 text-center text-gray-500 text-sm">
      No bills found{hasFilters ? " for the selected filters" : ""}.
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
