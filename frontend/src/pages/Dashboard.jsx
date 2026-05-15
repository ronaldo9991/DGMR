import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import PlatformTabs from "../components/PlatformTabs.jsx";
import { MonthlyBarChart } from "../components/SalesReturnChart.jsx";
import StatusPieChart from "../components/StatusPieChart.jsx";
import StateGraph from "../components/StateGraph.jsx";

const INR = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const NUM = (n) => Number(n || 0).toLocaleString("en-IN");

function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function PlatformCard({ platform, data }) {
  const color = platform === "Amazon" ? "border-blue-200 bg-blue-50" : "border-orange-200 bg-orange-50";
  const textColor = platform === "Amazon" ? "text-blue-700" : "text-orange-700";
  const dotColor = platform === "Amazon" ? "bg-blue-500" : "bg-orange-500";
  return (
    <div className={`rounded-2xl border-2 p-5 ${color}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
        <span className={`font-bold text-base ${textColor}`}>{platform}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-slate-500">Invoices</p>
          <p className="text-lg font-bold text-slate-900">{NUM(data?.count)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Taxable</p>
          <p className="text-lg font-bold text-slate-900">{INR(data?.taxable)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-slate-500">Grand Total</p>
          <p className="text-xl font-bold text-slate-900">{INR(data?.total)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  const load = (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    axios.get("/api/stats")
      .then((r) => setStats(r.data))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!stats) return null;
    if (activePlatform === "All") return stats;

    const pData = stats.platforms?.find((p) => p.name === activePlatform) || {};
    const filteredMonths = stats.by_month.map((m) => ({
      ...m,
      total: m.platforms?.[activePlatform] || 0,
      count: m.count,
    })).filter((m) => m.total > 0);

    return {
      ...stats,
      total_invoices: pData.count || 0,
      total_taxable: pData.taxable || 0,
      grand_total: pData.total || 0,
      total_cgst: 0,
      total_sgst: 0,
      total_igst: 0,
      by_month: filteredMonths,
    };
  }, [stats, activePlatform]);

  const tabCounts = useMemo(() => {
    if (!stats) return {};
    const counts = { All: stats.total_invoices };
    stats.platforms?.forEach((p) => { counts[p.name] = p.count; });
    return counts;
  }, [stats]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-500 text-sm">Loading dashboard…</p>
      </div>
    </div>
  );

  if (!stats) return (
    <div className="p-8 text-red-600">Failed to load stats. Is the backend running?</div>
  );

  const amazonData = stats.platforms?.find((p) => p.name === "Amazon");
  const flipkartData = stats.platforms?.find((p) => p.name === "Flipkart");

  return (
    <div className="p-8 space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Invoice analytics across all platforms</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            {refreshing ? (
              <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
          <a href="/api/excel" download className="btn-primary text-xs px-3 py-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Excel
          </a>
        </div>
      </div>

      {/* Platform split cards (always visible) */}
      {(amazonData || flipkartData) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {amazonData && <PlatformCard platform="Amazon" data={amazonData} />}
          {flipkartData && <PlatformCard platform="Flipkart" data={flipkartData} />}
        </div>
      )}

      {/* Platform tabs */}
      <div>
        <PlatformTabs active={activePlatform} onChange={setActivePlatform} counts={tabCounts} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Invoices"
          value={NUM(filtered.total_invoices)}
          sub={activePlatform === "All" ? "All platforms" : activePlatform}
          accent="bg-slate-100"
          icon={<svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard
          label="Taxable Value"
          value={INR(filtered.total_taxable)}
          sub="Before GST"
          accent="bg-emerald-50"
          icon={<svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>}
        />
        <StatCard
          label="Grand Total"
          value={INR(filtered.grand_total)}
          sub="Including all taxes"
          accent="bg-blue-50"
          icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Total GST"
          value={INR((stats.total_cgst || 0) + (stats.total_sgst || 0) + (stats.total_igst || 0))}
          sub={`IGST: ${INR(stats.total_igst)}`}
          accent="bg-purple-50"
          icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900">Monthly Revenue</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {activePlatform === "All" ? "All platforms" : activePlatform}
              </p>
            </div>
          </div>
          <MonthlyBarChart data={filtered.by_month} platform={activePlatform} />
        </div>

        <div className="card">
          <h2 className="font-bold text-slate-900 mb-5">Platform Split</h2>
          <StatusPieChart platforms={stats.platforms} />
        </div>
      </div>

      {/* GST breakdown + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-bold text-slate-900 mb-5">GST Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: "CGST (9%)", value: stats.total_cgst, color: "bg-blue-500" },
              { label: "SGST (9%)", value: stats.total_sgst, color: "bg-emerald-500" },
              { label: "IGST (18%)", value: stats.total_igst, color: "bg-orange-500" },
            ].map((g) => {
              const total = (stats.total_cgst || 0) + (stats.total_sgst || 0) + (stats.total_igst || 0);
              const pct = total > 0 ? ((g.value || 0) / total) * 100 : 0;
              return (
                <div key={g.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{g.label}</span>
                    <span className="font-bold text-slate-900">{INR(g.value)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${g.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2 className="font-bold text-slate-900 mb-4">Recent Activity</h2>
          <StateGraph recent={stats.recent_uploads} />
        </div>
      </div>
    </div>
  );
}
