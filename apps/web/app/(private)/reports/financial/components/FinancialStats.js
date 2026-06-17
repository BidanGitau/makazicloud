import { Building, DollarSign, Percent, TrendingUp, Users, Wrench } from "lucide-react";
import { formatCurrency } from "@/app/_lib/formatters";

export default function FinancialStats({ summary }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 md:grid-cols-6">
      <StatCard
        label="Total Revenue"
        value={formatCurrency(summary.totalRevenue)}
        icon={DollarSign}
        accent="text-green-700"
      />
      <StatCard
        label="Commission"
        value={formatCurrency(summary.totalCommission)}
        icon={Percent}
        accent="text-blue-700"
      />
      <StatCard
        label="Maintenance Cost"
        value={formatCurrency(summary.totalMaintenance)}
        icon={Wrench}
        accent="text-amber-700"
      />
      <StatCard
        label="Net Income"
        value={formatCurrency(summary.netIncome)}
        icon={TrendingUp}
        accent="text-emerald-700"
      />
      <StatCard
        label="Properties"
        value={String(summary.totalProperties)}
        icon={Building}
        accent="text-blue-700"
      />
      <StatCard
        label="Active Tenants"
        value={String(summary.totalTenants)}
        icon={Users}
        accent="text-blue-700"
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent = "text-black" }) {
  return (
    <div className="bg-white px-3 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/50">
          {label}
        </p>
        {Icon && <Icon className={`h-3.5 w-3.5 ${accent}`} strokeWidth={1.8} />}
      </div>
      <p
        className={`mt-1 text-sm font-bold tabular-nums ${accent}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
    </div>
  );
}
