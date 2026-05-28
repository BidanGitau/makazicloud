"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import DataTable from "react-data-table-component";
import { ArrearDetails } from "@/app/_lib/repositories";
import { useFormData } from "@/app/_hooks/useFormData";
import { API_BASE_URL, getTenantHeaders } from "@/app/_lib/api/client";
import { Send, Mail } from "lucide-react";
import ReminderModal from "./ReminderModal";
import SendArrearEmailModal from "@/app/_components/SendArrearEmailModal";
import { PageSkeleton } from "@/app/_components/LoadingSkeleton";
import PageWrapper from "@/app/_components/PageWrapper";
import Button from "@/app/_components/Button";
import { editorialTableStyles } from "@/app/_components/tableStyles";

export default function ArrearsPage() {
  const [loading, setLoading] = useState(true);
  const [arrearsData, setArrearsData] = useState([]);
  const [monthFilter, setMonthFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [smsPhoneNumbers, setSmsPhoneNumbers] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTenants, setEmailTenants] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState("arrears");

  const { properties, blocks } = useFormData();

  const STATUS_FILTERS = [
    { value: "arrears", label: "Arrears" },
    { value: "advance", label: "Advance" },
    { value: "all", label: "All" },
  ];

  const populateArrears = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/arrears/populate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeaders(),
        },
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Failed to populate arrears.");
      }
    } catch (err) {
      console.error("Failed to populate arrears:", err);
    }
  }, []);

  const fetchArrears = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      const rows = await ArrearDetails.getAll({
        order: { column: "month", ascending: true },
      });
      const enriched = rows.map((a) => {
        const status = String(a.status || "").toLowerCase();
        return {
          ...a,
          tenantName: a.tenant_name || "Unknown",
          tenantEmail: a.tenant_email || "",
          tenantPhone: a.tenant_phone || "",
          propertyId: a.property_id || null,
          propertyName: a.property_name || "N/A",
          blockId: a.block_id || null,
          blockName: a.block_name || "N/A",
          unitNumber: a.unit_number || "N/A",
          isArrears:
            new Date(a.month) <= today &&
            ["pending", "partial"].includes(status),
          isAdvance: status === "prepaid",
        };
      });
      setArrearsData(enriched);
    } catch (err) {
      console.error("Failed to fetch arrears:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArrears();
    populateArrears().then(fetchArrears).catch(console.error);
  }, []);

  const selectedPropertyBlocks = useMemo(
    () =>
      propertyFilter
        ? blocks.filter((b) => b.property_id === propertyFilter)
        : [],
    [blocks, propertyFilter],
  );
  const hasBlocksInSelectedProperty = selectedPropertyBlocks.length > 0;

  const filteredData = useMemo(
    () =>
      arrearsData.filter((row) => {
        const statusMatches =
          statusFilter === "all"
            ? row.isArrears || row.isAdvance
            : statusFilter === "advance"
              ? row.isAdvance
              : row.isArrears;
        return (
          statusMatches &&
          (!monthFilter || row.month?.slice(0, 7) === monthFilter) &&
          (!propertyFilter || row.propertyId === propertyFilter) &&
          (!blockFilter || row.blockId === blockFilter)
        );
      }),
    [arrearsData, statusFilter, monthFilter, propertyFilter, blockFilter],
  );

  const groupedData = useMemo(() => {
    const groups = new Map();

    filteredData.forEach((row) => {
      const key =
        row.tenant_id ||
        `${row.tenantName}-${row.propertyId}-${row.unitNumber}`;
      if (!groups.has(key)) {
        groups.set(key, {
          ...row,
          id: key,
          rows: [],
          monthCount: 0,
          totalDue: 0,
          totalPaid: 0,
          totalBalance: 0,
          totalCredit: 0,
        });
      }

      const group = groups.get(key);
      const amountDue = Number(row.amount_due || 0);
      const amountPaid = Number(row.amount_paid || 0);
      const balance = Number(row.balance || amountDue - amountPaid);
      const credit = row.isAdvance ? Math.max(0, amountPaid - amountDue) : 0;

      group.rows.push(row);
      group.monthCount += 1;
      group.totalDue += amountDue;
      group.totalPaid += amountPaid;
      group.totalCredit += credit;
      group.totalBalance += row.isAdvance ? 0 : Math.max(0, balance);
    });

    return [...groups.values()].map((group) => ({
      ...group,
      rows: group.rows.sort((a, b) =>
        String(a.month).localeCompare(String(b.month)),
      ),
    }));
  }, [filteredData]);

  const summary = useMemo(
    () => ({
      tenantsInArrears: new Set(
        arrearsData
          .filter((r) => r.isArrears && r.balance > 0)
          .map((r) => r.tenant_id || r.tenantName),
      ).size,
      tenantsInAdvance: new Set(
        arrearsData
          .filter((r) => r.isAdvance)
          .map((r) => r.tenant_id || r.tenantName),
      ).size,
    }),
    [arrearsData],
  );

  const openModal = (tenant = null, rows = null) => {
    setSelectedTenant(tenant);

    const source = rows || (tenant ? null : filteredData);
    const phones = source
      ? [...new Set(source.map((r) => r.tenantPhone).filter(Boolean))]
      : [];
    setSmsPhoneNumbers(phones);
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);

  const openEmailModal = (rows) => {
    const seen = new Set();
    const unique = rows.reduce((acc, r) => {
      if (!seen.has(r.tenant_id)) {
        seen.add(r.tenant_id);
        acc.push({
          tenant_id: r.tenant_id,
          tenantName: r.tenantName,
          tenantEmail: r.tenantEmail,
        });
      }
      return acc;
    }, []);
    setEmailTenants(unique);
    setShowEmailModal(true);
  };

  const formatMonth = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })
      : "-";

  const tenantColumns = [
    {
      name: "Tenant / Property",
      selector: (row) => row.tenantName,
      cell: (row) => (
        <div className="py-2">
          <p className="font-semibold">{row.tenantName}</p>
          <p className="text-sm text-gray-500">
            {row.propertyName} → {row.blockName} → {row.unitNumber}
          </p>
        </div>
      ),
      sortable: true,
      grow: 3,
    },
    {
      name: "Months",
      selector: (row) => row.monthCount,
      cell: (row) => (
        <span className="font-semibold text-black">
          {row.monthCount} {row.monthCount === 1 ? "month" : "months"}
        </span>
      ),
      sortable: true,
      width: "120px",
    },
    {
      name: "Total Due (KSh)",
      selector: (row) => Number(row.totalDue || 0),
      format: (row) => Number(row.totalDue || 0).toLocaleString("en-KE"),
      sortable: true,
      width: "160px",
    },
    {
      name: "Balance (KSh)",
      selector: (row) => Number(row.totalBalance || row.totalCredit || 0),
      sortable: true,
      width: "150px",
      cell: (row) => {
        if (row.totalCredit > 0 && row.totalBalance <= 0) {
          return (
            <span className="text-blue-700 font-semibold">
              +{row.totalCredit.toLocaleString("en-KE")}
            </span>
          );
        }
        if (row.totalBalance > 0) {
          return (
            <span className="text-red-600 font-semibold">
              {row.totalBalance.toLocaleString("en-KE")}
            </span>
          );
        }
        return <span className="text-green-600 font-medium">Cleared</span>;
      },
    },
    {
      name: "Action",
      cell: (row) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <button
            onClick={() => openModal(row, row.rows)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
          >
            <Send size={14} /> SMS
          </button>
          <button
            onClick={() => openEmailModal([row])}
            className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm"
          >
            <Mail size={14} /> Email
          </button>
        </div>
      ),
      width: "140px",
    },
  ];

  const ExpandedMonths = ({ data }) => (
    <div className="border-t border-stone-200 bg-stone-50 px-4 py-3">
      <div className="grid gap-2">
        {data.rows.map((row) => {
          const due = Number(row.amount_due || 0);
          const paid = Number(row.amount_paid || 0);
          const balance = Number(row.balance || due - paid);
          const credit = Math.max(0, paid - due);
          return (
            <div
              key={row.id || `${row.tenant_id}-${row.month}`}
              className="grid grid-cols-1 gap-2 border border-stone-200 bg-white px-3 py-2 text-sm sm:grid-cols-4 sm:items-center"
            >
              <div className="font-semibold text-black">
                {formatMonth(row.month)}
              </div>
              <div className="text-black/65">
                Due: KSh {due.toLocaleString("en-KE")}
              </div>
              <div className="text-black/65">
                Paid: KSh {paid.toLocaleString("en-KE")}
              </div>
              <div>
                {row.isAdvance ? (
                  <span className="font-semibold text-blue-700">
                    Credit: +KSh {credit.toLocaleString("en-KE")}
                  </span>
                ) : balance > 0 ? (
                  <span className="font-semibold text-red-600">
                    Balance: KSh {balance.toLocaleString("en-KE")}
                  </span>
                ) : (
                  <span className="font-semibold text-green-600">Cleared</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return <PageSkeleton cards={3} hasFilters />;
  }

  return (
    <PageWrapper>
      <div className="space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label">— Finance —</p>
            <h1
              className="mt-2 text-base font-black uppercase tracking-tight text-black sm:text-base"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Arrears
            </h1>
            <p className="mt-1 text-sm text-black/55">
              Outstanding rent and balances. Filter, email or SMS overdue
              tenants in bulk.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedRows.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => openEmailModal(selectedRows)}
                  className="inline-flex items-center gap-2 bg-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-blue-800"
                >
                  <Mail size={14} strokeWidth={1.8} />
                  Email ({selectedRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => openModal(null, selectedRows)}
                  className="inline-flex items-center gap-2 border border-blue-700 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700 transition-colors hover:bg-blue-50"
                >
                  <Send size={14} strokeWidth={1.8} />
                  SMS ({selectedRows.length})
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => openModal(null)}
              className="inline-flex items-center gap-2 border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50"
            >
              <Send size={14} strokeWidth={1.8} />
              Send all SMS
            </button>
            <button
              type="button"
              onClick={async () => {
                await populateArrears();
                await fetchArrears();
              }}
              className="border border-stone-300 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-black/65 transition-colors hover:bg-stone-50"
            >
              Refresh
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200">
          <div className="bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Tenants in Arrears
            </p>
            <p
              className="mt-1 text-lg font-black tabular-nums text-red-600"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {summary.tenantsInArrears}
            </p>
          </div>
          <div className="bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
              Paid in Advance
            </p>
            <p
              className="mt-1 text-lg font-black tabular-nums text-blue-700"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {summary.tenantsInAdvance}
            </p>
          </div>
        </div>

        <div className="border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <option value="">All Months</option>
              {[...new Set(arrearsData.map((a) => a.month?.slice(0, 7)))]
                .filter(Boolean)
                .sort()
                .map((m) => (
                  <option key={m} value={m}>
                    {new Date(m + "-02").toLocaleDateString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </option>
                ))}
            </select>

            <select
              value={propertyFilter}
              onChange={(e) => {
                setPropertyFilter(e.target.value);
                setBlockFilter("");
              }}
              className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <option value="">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {propertyFilter && hasBlocksInSelectedProperty && (
              <select
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
                className="border border-stone-300 bg-white px-3 py-2 text-sm text-black focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              >
                <option value="">All Blocks</option>
                {selectedPropertyBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex border border-stone-300 text-[11px] font-bold uppercase tracking-[0.18em]">
              {STATUS_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`px-4 py-2 transition-colors ${
                    statusFilter === value
                      ? "bg-blue-700 text-white"
                      : "bg-white text-black/55 hover:bg-stone-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {(monthFilter || propertyFilter || blockFilter) && (
              <button
                type="button"
                onClick={() => {
                  setMonthFilter("");
                  setPropertyFilter("");
                  setBlockFilter("");
                }}
                className="self-center text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div>
          <DataTable
            columns={tenantColumns}
            data={groupedData}
            customStyles={editorialTableStyles}
            pagination
            highlightOnHover
            striped
            responsive
            expandableRows
            expandableRowsComponent={ExpandedMonths}
            selectableRows
            onSelectedRowsChange={({ selectedRows: rows }) =>
              setSelectedRows(rows)
            }
            noDataComponent={
              <div className="py-10 text-center text-gray-500 text-sm">
                {statusFilter === "advance"
                  ? "No advance payments found."
                  : statusFilter === "all"
                    ? "No arrears or advance payments found."
                    : "No arrears found."}
              </div>
            }
          />
        </div>
      </div>

      <SendArrearEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        tenants={emailTenants}
      />

      <ReminderModal
        isOpen={showModal}
        onClose={closeModal}
        tenant={selectedTenant}
        phoneNumbers={smsPhoneNumbers}
      />
    </PageWrapper>
  );
}
