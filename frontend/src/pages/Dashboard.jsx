import { useEffect, useState } from "react";
import axios from "axios";
import SalesReturnChart from "../components/SalesReturnChart.jsx";
import StatusPieChart from "../components/StatusPieChart.jsx";
import StateGraph from "../components/StateGraph.jsx";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`card border-l-4 ${color}`}>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-600 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get("/api/stats")
      .then((r) => setStats(r.data))
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading dashboard...
      </div>
    );
  }
  if (error) {
    return <div className="text-red-600 font-medium">{error}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time overview of your railway invoices</p>
        </div>
        <a href="/api/excel" download className="btn-primary">
          <span>⬇</span> Download Excel
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Sales"
          value={fmt(stats.total_sales_amount)}
          sub={`${stats.sales_count} invoices`}
          color="border-blue-500"
        />
        <StatCard
          label="Total Returns"
          value={fmt(stats.total_returns_amount)}
          sub={`${stats.returns_count} invoices`}
          color="border-orange-500"
        />
        <StatCard
          label="Net Revenue"
          value={fmt(stats.net_revenue)}
          sub="Sales minus returns"
          color="border-emerald-500"
        />
        <StatCard
          label="Pending Payments"
          value={stats.payment_breakdown?.Pending ?? 0}
          sub="invoices awaiting payment"
          color="border-yellow-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Monthly Sales vs Returns</h2>
          <SalesReturnChart data={stats.by_month} />
        </div>
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Payment Status Breakdown</h2>
          <StatusPieChart breakdown={stats.payment_breakdown} />
        </div>
      </div>

      {/* Recent upload state graph */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Recent Upload Activity</h2>
        <StateGraph recent={stats.recent_uploads} />
      </div>
    </div>
  );
}
