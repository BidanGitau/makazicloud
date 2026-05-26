"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, Select } from "antd";
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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const moneyFormatter = new Intl.NumberFormat("en-KE", {
  maximumFractionDigits: 0,
});

const formatMoney = (value) =>
  `KSh ${moneyFormatter.format(Number(value || 0))}`;
const formatNumber = (value) =>
  moneyFormatter.format(Number(value || 0));

function MetricCard({ title, value, helper, icon: Icon, accent = false }) {
  return (
    <div
      className={`flex flex-col justify-between border p-5 sm:p-6 ${
        accent
          ? "border-blue-700 bg-blue-700 text-white"
          : "border-stone-200 bg-white text-black"
      }`}
    >
      <div className="flex items-center justify-between">
        <p
          className={`text-[10px] font-bold uppercase tracking-[0.22em] ${
            accent ? "text-white/55" : "text-black/45"
          }`}
        >
          {title}
        </p>
        <Icon
          className={`h-4 w-4 ${accent ? "text-white/70" : "text-black/40"}`}
          strokeWidth={1.8}
        />
      </div>
      <div className="mt-6">
        <p
          className={`text-3xl font-black tabular-nums sm:text-4xl ${
            accent ? "text-white" : "text-black"
          }`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {value}
        </p>
        <p
          className={`mt-2 text-[11px] font-medium leading-relaxed ${
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
      className={`inline-flex min-w-[60px] items-center justify-center px-2 py-1 font-mono text-[11px] font-bold tabular-nums ${cls}`}
    >
      {rate.toFixed(1)}%
    </span>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState([]);
  const [properties, setProperties] = useState([]);


  const [monthlyAggregates, setMonthlyAggregates] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(
    String(new Date().getFullYear()),
  );
  const [selectedProperty, setSelectedProperty] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      try {
        const bundle = await Dashboard.getBundle();
        const years = bundle?.available_years || [new Date().getFullYear()];
        const currentYear = new Date().getFullYear();
        const defaultYear = years.includes(currentYear)
          ? currentYear
          : years[0];

        setSelectedYear(String(defaultYear));
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
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

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
    if (!selectedProperty) return overview;
    return overview.filter((row) => row.property_id === selectedProperty);
  }, [overview, selectedProperty]);

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
      ? filteredOverview.reduce((a, b) => a + Number(b.occupancy_rate || 0), 0) /
        filteredOverview.length
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
    const collected = Array(12).fill(0);
    const outstanding = Array(12).fill(0);

    monthlyAggregates.forEach((agg) => {
      if (agg.year !== selectedYearNum) return;
      if (selectedProperty && agg.property_id !== selectedProperty) return;
      collected[agg.month] += Number(agg.collected || 0);
      outstanding[agg.month] += Number(agg.outstanding || 0);
    });

    return { collected, outstanding };
  }, [monthlyAggregates, selectedProperty, selectedYear]);

  const columns = [
    {
      title: "Property",
      dataIndex: "property_name",
      key: "property_name",
      render: (text) => (
        <span className="text-sm font-bold text-black">{text || "—"}</span>
      ),
    },
    {
      title: "Units",
      dataIndex: "total_units",
      align: "center",
      render: (val) => (
        <span
          className="font-mono text-sm font-bold tabular-nums text-black"
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
          className="font-mono text-sm font-bold tabular-nums text-black"
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
          className="font-mono text-sm font-bold tabular-nums text-black"
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
          className="font-mono text-sm font-bold tabular-nums text-black"
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
            className={`font-mono text-sm font-bold tabular-nums ${
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
    {
      title: "",
      key: "action",
      align: "right",
      render: () => (
        <button className="inline-flex items-center gap-1.5 border border-stone-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-black/70 transition-colors hover:border-blue-700 hover:text-black">
          <Bell className="h-3 w-3" strokeWidth={1.8} />
          Notify
        </button>
      ),
    },
  ];

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="w-full bg-white">
      <div className="content-full-width w-full space-y-px bg-stone-200 py-px sm:py-px">

        <section className="bg-white px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="section-label">— Portfolio Command Center —</p>
              <h1
                className="mt-3 text-3xl font-black uppercase leading-tight tracking-tight text-black sm:text-5xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Dashboard Overview.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-black/55">
                Collection, occupancy, and arrears across your properties.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:w-[460px]">
              <div>
                <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                  <CalendarDays className="h-3 w-3" strokeWidth={1.8} />
                  Year
                </label>
                <Select
                  value={selectedYear}
                  onChange={setSelectedYear}
                  options={yearOptions}
                  style={{ width: "100%" }}
                  size="large"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black/55">
                  <SlidersHorizontal className="h-3 w-3" strokeWidth={1.8} />
                  Property
                </label>
                <Select
                  placeholder="All Properties"
                  value={selectedProperty || undefined}
                  onChange={(value) => setSelectedProperty(value || "")}
                  allowClear
                  options={properties.map((p) => ({
                    label: p.name,
                    value: p.id,
                  }))}
                  style={{ width: "100%" }}
                  size="large"
                />
              </div>
            </div>
          </div>
        </section>


        <section className="grid grid-cols-1 gap-px bg-stone-200 sm:grid-cols-2 xl:grid-cols-4">
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
          />
        </section>


        <section className="bg-white">
          <div className="border-b border-stone-200 px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-1">
              <p className="section-label">— Property Summary —</p>
              <h3
                className="text-xl font-black uppercase tracking-tight text-black sm:text-2xl"
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
                pageSize: 6,
                showSizeChanger: false,
                showTotal: (total) => `${total} properties`,
              }}
              className="editorial-table full-width-table"
              scroll={{ x: "100%" }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
