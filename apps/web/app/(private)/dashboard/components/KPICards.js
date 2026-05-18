import {
  TrendingUp,
  DollarSign,
  CreditCard,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default function KPICards({ totals }) {
  return (
    <div className="responsive-grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="bg-white/20 rounded-xl p-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <ArrowUpRight className="w-5 h-5 opacity-80" />
        </div>
        <p className="text-blue-100 text-sm font-medium mb-1">Total Collected</p>
        <p className="text-2xl md:text-3xl font-bold">
          KSh {totals.collected.toLocaleString()}
        </p>
      </div>

      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="bg-white/20 rounded-xl p-3">
            <DollarSign className="w-6 h-6" />
          </div>
          <ArrowDownRight className="w-5 h-5 opacity-80" />
        </div>
        <p className="text-red-100 text-sm font-medium mb-1">Outstanding</p>
        <p className="text-2xl md:text-3xl font-bold">
          KSh {totals.outstanding.toLocaleString()}
        </p>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="bg-white/20 rounded-xl p-3">
            <Users className="w-6 h-6" />
          </div>
          <TrendingUp className="w-5 h-5 opacity-80" />
        </div>
        <p className="text-purple-100 text-sm font-medium mb-1">Occupancy Rate</p>
        <p className="text-2xl md:text-3xl font-bold">
          {totals.occupancy_rate.toFixed(1)}%
        </p>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className="bg-white/20 rounded-xl p-3">
            <TrendingUp className="w-6 h-6" />
          </div>
          <ArrowUpRight className="w-5 h-5 opacity-80" />
        </div>
        <p className="text-green-100 text-sm font-medium mb-1">Collection Rate</p>
        <p className="text-2xl md:text-3xl font-bold">
          {totals.collection_rate.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
