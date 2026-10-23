import { Building, DollarSign, Percent, TrendingUp, Users, Wrench } from "lucide-react";
import { formatCurrency } from "@/app/_lib/formatters";
import StatCard from "@/app/_components/StatCard";

export default function FinancialStats({ summary }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-stone-200 bg-stone-200 md:grid-cols-6">
      <StatCard size="sm"
        label="Total Revenue"
        value={formatCurrency(summary.totalRevenue)}
        icon={DollarSign}
        accent="text-green-700"
      />
      <StatCard size="sm"
        label="Commission"
        value={formatCurrency(summary.totalCommission)}
        icon={Percent}
        accent="text-blue-700"
      />
      <StatCard size="sm"
        label="Maintenance Cost"
        value={formatCurrency(summary.totalMaintenance)}
        icon={Wrench}
        accent="text-amber-700"
      />
      <StatCard size="sm"
        label="Net Income"
        value={formatCurrency(summary.netIncome)}
        icon={TrendingUp}
        accent="text-emerald-700"
      />
      <StatCard size="sm"
        label="Properties"
        value={String(summary.totalProperties)}
        icon={Building}
        accent="text-blue-700"
      />
      <StatCard size="sm"
        label="Active Tenants"
        value={String(summary.totalTenants)}
        icon={Users}
        accent="text-blue-700"
      />
    </div>
  );
}

