import { DollarSign, Percent, Users, TrendingUp } from "lucide-react";

export default function KPICards({ data }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {data.map((kpi) => (
        <div
          key={kpi.title}
          className="bg-white rounded-xl p-6 shadow hover:shadow-md transition"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">{kpi.title}</h3>
            {kpi.icon}
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
          {kpi.subtitle && (
            <p className="text-xs text-gray-500 mt-1">{kpi.subtitle}</p>
          )}
        </div>
      ))}
    </div>
  );
}
