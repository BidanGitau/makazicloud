"use client";

import { useEffect, useMemo, useState } from "react";
import { Table } from "antd";
import {
  TrendingUp,
  Users,
  DollarSign,
  CreditCard,
  Bell,
  CalendarDays,
  SlidersHorizontal,
} from "lucide-react";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Dashboard } from "@/app/_lib/repositories";
import { DashboardSkeleton } from "@/app/_components/LoadingSkeleton";
import DashboardCharts from "./components/DashboardCharts";
import { useAuth } from "@/app/_context/AuthContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

const moneyFormatter = new Intl.NumberFormat("en-KE", {
  maximumFractionDigits: 0,
});

const formatMoney = (value) =>
  `KSh ${moneyFormatter.format(Number(value || 0))}`;
const formatNumber = (value) => moneyFormatter.format(Number(value || 0));

const MONTH_OPTIONS = [
  { label: "January", value: "0" },
  { label: "February", value: "1" },
  { label: "March", value: "2" },
  { label: "April", value: "3" },
  { label: "May", value: "4" },
  { label: "June", value: "5" },
  { label: "July", value: "6" },
  { label: "August", value: "7" },
  { label: "September", value: "8" },
  { label: "October", value: "9" },
  { label: "November", value: "10" },
  { label: "December", value: "11" },
];

const toDateInput = (date) => date.toISOString().slice(0, 10);

function getDashboardDateRange(yearValue) {
  const year = Number(yearValue) || new Date().getFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 12, 0));

  return {
    start_date: toDateInput(start),
    end_date: toDateInput(end),
  };
}

function MetricCard({ title, value, helper, icon: Icon, accent = false }) {
  return (
    <div
      className={`flex min-h-[92px] flex-col justify-between border p-3 sm:min-h-[100px] ${
        accent
          ? "border-blue-700 bg-blue-700 text-white"
          : "border-stone-200 bg-white text-black"
      }`}
    >
      <div className="flex items-center justify-between">
        <p
          className={`text-[9px] font-bold uppercase tracking-[0.16em] ${
            accent ? "text-white/55" : "text-black/45"
          }`}
        >
          {title}
        </p>
        <Icon
          className={`h-3.5 w-3.5 ${accent ? "text-white/70" : "text-black/40"}`}
          strokeWidth={1.8}
        />
      </div>
      <div className="mt-2">
        <p
          className={`break-words text-base font-black leading-tight tabular-nums ${
            accent ? "text-white" : "text-black"
          }`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {value}
        </p>
        <p
          className={`mt-1 text-[10px] font-medium leading-snug ${
            accent ? "text-white/55" : "text-black/50"
          }`}
        >
          {helper}
        </p>
      </div>
    </div>
  );
}

function RateBadge({ value, threshold = { good: 80, ok: 50 } }) {
  const rate = Number(value || 0);
  const variant =
    rate >= threshold.good
      ? "filled"
      : rate >= threshold.ok
        ? "outlined"
        : "muted";

  const cls =
    variant === "filled"
      ? "border-2 border-blue-700 bg-blue-700 text-white"
      : variant === "outlined"
        ? "border-2 border-blue-700 bg-white text-black"
        : "border border-stone-300 bg-stone-50 text-black/55";

  return (
    <span
      className={`inline-flex min-w-[48px] items-center justify-center px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums ${cls}`}
    >
      {rate.toFixed(1)}%
    </span>
  );
}

export default function DashboardPage() {
  const { hasPermission } = useAuth();
  const canSendArrearsReminders = hasPermission("arrears:manage");
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState([]);
  const [properties, setProperties] = useState([]);

  const [monthlyAggregates, setMonthlyAggregates] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchDashboard() {
      setLoading(true);
      try {
        const bundle = await Dashboard.getBundle(getDashboardDateRange(selectedYear));
        const years = bundle?.available_years || [new Date().getFullYear()];
        const currentYear = new Date().getFullYear();
        const defaultYear = years.includes(currentYear)
          ? currentYear
          : years[0];

        if (ignore) return;

        if (!years.includes(Number(selectedYear))) {
          setSelectedYear(String(defaultYear));
          return;
        }

        setOverview(
          (bundle?.overview || []).map((row) => ({
            ...row,
            row_key:
              row.property_id ||
              row.id ||
              `property-${row.property_name || "unknown"}-${row.total_units || 0}-${row.total_collected || 0}`,
          })),
        );
        setProperties(bundle?.properties || []);
        setMonthlyAggregates(bundle?.monthly_aggregates || []);
        setAvailableYears(years);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchDashboard();
    return () => {
      ignore = true;
    };
  }, [selectedYear]);

  const yearOptions = useMemo(() => {
    const years = new Set([
      Number(selectedYear) || new Date().getFullYear(),
      ...availableYears,
    ]);
    return [...years]
      .sort((a, b) => b - a)
      .map((year) => ({ label: String(year), value: String(year) }));
  }, [availableYears, selectedYear]);

  const filteredOverview = useMemo(() => {
    const selectedYearNum = Number(selectedYear);
    const selectedMonthSet = new Set(selectedMonths.map(Number));
    const monthFiltered = selectedMonths.length > 0;
    const rows = selectedProperty
      ? overview.filter((row) => row.property_id === selectedProperty)
      : overview;

    return rows.map((row) => {
      const totalsForMonths = monthlyAggregates.reduce(
        (total, agg) => {
          if (agg.property_id !== row.property_id) return total;
          if (agg.year !== selectedYearNum) return total;
          if (monthFiltered && !selectedMonthSet.has(agg.month)) return total;
          total.collected += Number(agg.collected || 0);
          total.outstanding += Number(agg.outstanding || 0);
          return total;
        },
        { collected: 0, outstanding: 0 },
      );
      const collectionBase =
        totalsForMonths.collected + totalsForMonths.outstanding;

      return {
        ...row,
        total_collected: totalsForMonths.collected,
        total_outstanding: totalsForMonths.outstanding,
        collection_rate: collectionBase
          ? (totalsForMonths.collected / collectionBase) * 100
          : 0,
      };
    });
  }, [monthlyAggregates, overview, selectedMonths, selectedProperty, selectedYear]);

  const totals = useMemo(() => {
    const sumCollected = filteredOverview.reduce(
      (a, b) => a + Number(b.total_collected || 0),
      0,
    );
    const sumOutstanding = filteredOverview.reduce(
      (a, b) => a + Number(b.total_outstanding || 0),
      0,
    );
    const avgOccupancy = filteredOverview.length
      ? filteredOverview.reduce(
          (a, b) => a + Number(b.occupancy_rate || 0),
          0,
        ) / filteredOverview.length
      : 0;
    const avgCollection = filteredOverview.length
      ? filteredOverview.reduce(
          (a, b) => a + Number(b.collection_rate || 0),
          0,
        ) / filteredOverview.length
      : 0;
    return {
      collected: sumCollected,
      outstanding: sumOutstanding,
      occupancy_rate: avgOccupancy,
      collection_rate: avgCollection,
    };
  }, [filteredOverview]);

  const monthlyData = useMemo(() => {
    const selectedYearNum = Number(selectedYear);
    const selectedMonthSet = new Set(selectedMonths.map(Number));
    const collected = Array(12).fill(0);
    const outstanding = Array(12).fill(0);

    monthlyAggregates.forEach((agg) => {
      if (agg.year !== selectedYearNum) return;
      if (selectedMonths.length > 0 && !selectedMonthSet.has(agg.month)) return;
      if (selectedProperty && agg.property_id !== selectedProperty) return;
      collected[agg.month] += Number(agg.collected || 0);
      outstanding[agg.month] += Number(agg.outstanding || 0);
    });

    return { collected, outstanding };
  }, [monthlyAggregates, selectedMonths, selectedProperty, selectedYear]);

  const columns = [
    {
      title: "Property",
      dataIndex: "property_name",
      key: "property_name",
      render: (text) => (
        <span className="text-xs font-bold text-black">{text || "—"}</span>
      ),
    },
    {
      title: "Units",
      dataIndex: "total_units",
      align: "center",
      render: (val) => (
        <span
          className="font-mono text-xs font-bold tabular-nums text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {val || 0}
        </span>
      ),
    },
    {
      title: "Occupied",
      dataIndex: "occupied_units",
      align: "center",
      render: (val) => (
        <span
          className="font-mono text-xs font-bold tabular-nums text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {val || 0}
        </span>
      ),
    },
    {
      title: "Tenants",
      dataIndex: "active_tenants",
      align: "center",
      render: (val) => (
        <span
          className="font-mono text-xs font-bold tabular-nums text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {val || 0}
        </span>
      ),
    },
    {
      title: "Occupancy",
      dataIndex: "occupancy_rate",
      align: "center",
      render: (val) => <RateBadge value={val} />,
    },
    {
      title: "Collected",
      dataIndex: "total_collected",
      align: "right",
      render: (val) => (
        <span
          className="font-mono text-xs font-bold tabular-nums text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {formatNumber(val)}
        </span>
      ),
    },
    {
      title: "Outstanding",
      dataIndex: "total_outstanding",
      align: "right",
      render: (val) => {
        const num = Number(val || 0);
        return (
          <span
            className={`font-mono text-xs font-bold tabular-nums ${
              num > 0 ? "text-black" : "text-black/30"
            }`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatNumber(val)}
          </span>
        );
      },
    },
    {
      title: "Collection",
      dataIndex: "collection_rate",
      align: "center",
      render: (val) => (
        <RateBadge value={val} threshold={{ good: 85, ok: 60 }} />
      ),
    },
    canSendArrearsReminders && {
      title: "",
      key: "action",
      align: "right",
      render: () => (
        <button className="inline-flex items-center gap-1 border border-stone-300 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-black/70 transition-colors hover:border-blue-700 hover:text-black">
          <Bell className="h-3 w-3" strokeWidth={1.8} />
          Notify
        </button>
      ),
    },
  ].filter(Boolean);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="w-full bg-white">
      <div className="content-full-width w-full space-y-px bg-stone-200 py-px sm:py-px">
        <section className="dashboard-sticky-header bg-white px-2 py-1 sm:px-3">
          <div className="flex justify-end">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:max-w-[520px]">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-black/55">
                  <CalendarDays className="h-3 w-3" strokeWidth={1.8} />
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                  className="h-9 w-full border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black outline-none transition-colors focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                >
                  {yearOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-black/55">
                  <CalendarDays className="h-3 w-3" strokeWidth={1.8} />
                  Month
                </label>
                <div className="grid grid-cols-4 gap-px border border-stone-300 bg-stone-300">
                  <button
                    type="button"
                    onClick={() => setSelectedMonths([])}
                    className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                      selectedMonths.length === 0
                        ? "bg-blue-700 text-white"
                        : "bg-white text-black/65 hover:bg-stone-50"
                    }`}
                  >
                    All
                  </button>
                  {MONTH_OPTIONS.map((option) => {
                    const active = selectedMonths.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setSelectedMonths((current) =>
                            active
                              ? current.filter((value) => value !== option.value)
                              : [...current, option.value],
                          )
                        }
                        className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                          active
                            ? "bg-blue-700 text-white"
                            : "bg-white text-black/65 hover:bg-stone-50"
                        }`}
                      >
                        {option.label.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-black/55">
                  <SlidersHorizontal className="h-3 w-3" strokeWidth={1.8} />
                  Property
                </label>
                <select
                  value={selectedProperty || ""}
                  onChange={(event) => setSelectedProperty(event.target.value)}
                  className="h-9 w-full border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-black outline-none transition-colors focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                >
                  <option value="">All Properties</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="grid auto-rows-fr grid-cols-1 gap-px bg-stone-200 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Collected"
            value={formatMoney(totals.collected)}
            helper={`${filteredOverview.length} properties in view`}
            icon={CreditCard}
            accent
          />
          <MetricCard
            title="Outstanding"
            value={formatMoney(totals.outstanding)}
            helper="Open balance requiring follow-up"
            icon={DollarSign}
          />
          <MetricCard
            title="Avg Occupancy"
            value={`${totals.occupancy_rate.toFixed(1)}%`}
            helper="Occupied units across selected portfolio"
            icon={Users}
          />
          <MetricCard
            title="Collection Rate"
            value={`${totals.collection_rate.toFixed(1)}%`}
            helper="Paid versus billed rent"
            icon={TrendingUp}
          />
        </section>

        <section className="bg-white p-px">
          <DashboardCharts
            monthlyData={monthlyData}
            filteredOverview={filteredOverview}
            selectedYear={selectedYear}
            selectedMonths={selectedMonths}
          />
        </section>

        <section className="bg-white">
          <div className="border-b border-stone-200 px-3 py-2 sm:px-4">
            <div className="flex flex-col gap-1">
              <p className="section-label">— Property Summary —</p>
              <h3
                className="text-base font-black uppercase tracking-tight text-black"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Detailed breakdown.
              </h3>
            </div>
          </div>
          <div className="w-full">
            <Table
              columns={columns}
              dataSource={filteredOverview}
              rowKey="row_key"
              pagination={{
                pageSize: 12,
                showSizeChanger: false,
                showTotal: (total) => `${total} properties`,
              }}
              className="editorial-table compact-ant-table full-width-table"
              scroll={{ x: "100%" }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
