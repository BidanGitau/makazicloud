"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus } from "lucide-react";
import { UtilityBills, Properties } from "@/app/_lib/repositories";
import { usePropertyStructure } from "@/app/_hooks/usePropertyStructure";
import ModalSlider from "@/app/_components/ModalSlider";
import BillForm from "./BillForm";
import { buildBillColumns } from "./BillColumns";
import { showToast } from "@/app/_components/CustomToast";
import { useAuth } from "@/app/_context/AuthContext";
import { toggleSetItem } from "@/app/_lib/set-utils";
import StatCard from "@/app/_components/StatCard";
import UtilityFilters from "./components/UtilityFilters";
import UtilityPropertySection, {
  NoUtilityBillsMessage,
} from "./components/UtilityPropertySection";
import {
  billStats,
  buildUtilityTree,
  defaultFilters,
  filterBills,
} from "./utils/utilityTree";

export default function UtilityPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("utilities:manage");
  const [bills, setBills] = useState([]);
  const [fullProperties, setFullProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [expandedProperties, setExpandedProperties] = useState(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState(new Set());

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

  const filteredBills = useMemo(() => filterBills(bills, filters), [bills, filters]);
  const stats = useMemo(() => billStats(filteredBills), [filteredBills]);

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

  const utilityTree = useMemo(
    () => buildUtilityTree(filteredBills, fullProperties),
    [filteredBills, fullProperties],
  );

  const hasFilters = Object.values(filters).some(Boolean);
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

      <UtilityFilters
        filters={filters}
        setFilters={setFilters}
        properties={fullProperties}
        blocks={filterBlocks}
        units={filterUnits}
        hasFilters={hasFilters}
      />

      <div className="space-y-1">
        {utilityTree.length === 0 ? (
          <NoUtilityBillsMessage hasFilters={hasFilters} />
        ) : (
          utilityTree.map((property) => (
            <UtilityPropertySection
              key={property.id}
              property={property}
              columns={nestedBillColumns}
              expandedProperties={expandedProperties}
              expandedBlocks={expandedBlocks}
              onToggleProperty={(id) => toggleSetItem(setExpandedProperties, id)}
              onToggleBlock={(key) => toggleSetItem(setExpandedBlocks, key)}
            />
          ))
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
