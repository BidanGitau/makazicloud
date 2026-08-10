"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import DataTable from "react-data-table-component";
import { ChevronDown, Plus, Filter } from "lucide-react";
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
  const [expandedProperties, setExpandedProperties] = useState(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState(new Set());

  const setFilter = useCallback(
    (key, value) => setFilters((f) => ({ ...f, [key]: value })),
    [],
  );

  const {
    propertyBlocks: filterBlocks,
    propertyUnits: filterUnits,
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
          paid_amount: block.bills.reduce(
            (sum, bill) => sum + Number(bill.paid_amount || 0),
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
    <div className="space-y-2 p-1 sm:p-2">
      <header className="flex justify-end">
        {canManage && (
          <button
            type="button"
            onClick={() => setActiveModal("bill")}
            className="inline-flex items-center gap-1.5 bg-blue-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-blue-800"
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

      <div className="border border-stone-200 bg-white p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-black/55">
          <Filter className="h-3.5 w-3.5" strokeWidth={1.8} /> Filters
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <select
            value={filters.property}
            onChange={(e) =>
              setFilters({ ...FILTER_INIT, property: e.target.value })
            }
            className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
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
            className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-black/40"
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
            className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-black/40"
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
            className="h-9 border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
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

      <div className="space-y-1">
        {utilityTree.length === 0 ? (
          <NoUtilityBillsMessage hasFilters={hasFilters} />
        ) : (
          utilityTree.map((property) => {
            const propertyOpen = expandedProperties.has(property.id);
            return (
              <section key={property.id} className="border border-stone-200 bg-white">
                <button
                  type="button"
                  onClick={() => toggleSetItem(setExpandedProperties, property.id)}
                  className="grid w-full gap-px border-b border-stone-200 bg-stone-200 text-left transition-colors hover:bg-stone-300 sm:grid-cols-[minmax(0,2fr)_90px_90px_140px_140px]"
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
                  <Metric label="Bills" value={property.bill_count} />
                  <Metric label="Pending" value={property.pending_count} />
                  <Metric
                    label="Total"
                    value={`KSh ${Number(property.total_amount || 0).toLocaleString("en-KE")}`}
                  />
                  <Metric
                    label="Paid"
                    value={`KSh ${Number(property.paid_amount || 0).toLocaleString("en-KE")}`}
                  />
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
                            className="grid w-full gap-px border-b border-stone-200 bg-stone-200 text-left transition-colors hover:bg-stone-300 sm:grid-cols-[minmax(0,2fr)_90px_90px_140px_140px]"
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
                            <Metric label="Bills" value={block.bill_count} />
                            <Metric label="Pending" value={block.pending_count} />
                            <Metric
                              label="Total"
                              value={`KSh ${Number(block.total_amount || 0).toLocaleString("en-KE")}`}
                            />
                            <Metric
                              label="Paid"
                              value={`KSh ${Number(block.paid_amount || 0).toLocaleString("en-KE")}`}
                            />
                          </button>
                          {blockOpen && nestedBillTable(block.bills || [])}
                        </div>
                      );
                    })}

                    {property.bills?.length > 0 && (
                      <div className="border border-stone-200 bg-white">
                        <div className="border-b border-stone-200 px-2 py-1.5">
                          <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
                            Property Utility Bills
                          </p>
                        </div>
                        {nestedBillTable(property.bills)}
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
