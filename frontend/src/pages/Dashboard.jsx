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
    axios.get("/api/stats")
      .then((r) => setStats(r.data))
      .catch(() => setError("Failed to load stats — is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">Loading dashboard…</div>
  );
  if (error) return <div className="text-red-600 font-medium">{error}</div>;

  const platformNames = (stats.platforms || []).map((p) => p.name);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Amazon &amp; Flipkart invoice overview</p>
        </div>
        <a href="/api/excel" download className="btn-primary">
          <span>⬇</span> Download Excel
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Invoices"
          value={stats.total_invoices}
          sub={platformNames.join(" + ") || "No uploads yet"}
          color="border-blue-500"
        />
        <StatCard
          label="Taxable Value"
          value={fmt(stats.total_taxable)}
          sub="Before GST"
          color="border-emerald-500"
        />
        <StatCard
          label="Grand Total"
          value={fmt(stats.grand_total)}
          sub="Including GST"
          color="border-brand-600"
        />
        <StatCard
          label="IGST Collected"
          value={fmt(stats.total_igst)}
          sub={`CGST: ${fmt(stats.total_cgst)} · SGST: ${fmt(stats.total_sgst)}`}
          color="border-purple-500"
        />
      </div>

      {/* Per-platform cards */}
      {stats.platforms && stats.platforms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.platforms.map((p) => (
            <div key={p.name} className="card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                p.name === "Flipkart" ? "bg-orange-500" : p.name === "Amazon" ? "bg-blue-600" : "bg-purple-500"
              }`}>
                {p.name[0]}
              </div>
              <div>
                <div className="font-semibold text-gray-900">{p.name}</div>
                <div className="text-sm text-gray-500">{p.count} invoices · {fmt(p.total)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Monthly Revenue by Platform</h2>
          <SalesReturnChart data={stats.by_month} platforms={platformNames} />
        </div>
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Invoices by Platform</h2>
          <StatusPieChart platforms={stats.platforms} />
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
