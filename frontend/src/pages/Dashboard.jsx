import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import PlatformTabs from "../components/PlatformTabs.jsx";
import { SalesVsReturnsChart, MonthlyBarChart } from "../components/SalesReturnChart.jsx";
import StatusPieChart from "../components/StatusPieChart.jsx";
import StateBarChart from "../components/StateBarChart.jsx";
import StateGraph from "../components/StateGraph.jsx";

const INR = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const NUM = (n) => Number(n || 0).toLocaleString("en-IN");

/* ── Stat card ───────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon, accent, highlight }) {
  return (
    <div className={`card p-4 sm:p-6 flex items-start gap-3 sm:gap-4 ${highlight ? "ring-2 ring-offset-1 " + highlight : ""}`}>
      <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide leading-tight">{label}</p>
        <p className="text-base sm:text-xl font-bold text-slate-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 hidden sm:block">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Platform split card ─────────────────────────────────────────────── */
function PlatformCard({ platform, data }) {
  const isAmazon = platform === "Amazon";
  const border = isAmazon ? "border-blue-200" : "border-orange-200";
  const bg     = isAmazon ? "bg-blue-50"     : "bg-orange-50";
  const dot    = isAmazon ? "bg-blue-500"    : "bg-orange-500";
  const text   = isAmazon ? "text-blue-700"  : "text-orange-700";
  return (
    <div className={`rounded-2xl border-2 p-5 ${border} ${bg}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
          <span className={`font-bold text-base ${text}`}>{platform}</span>
        </div>
        <a href={`/api/excel?platform=${platform}`} download
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
            isAmazon ? "border-blue-300 text-blue-700 hover:bg-blue-100" : "border-orange-300 text-orange-700 hover:bg-orange-100"
          }`}>
          ⬇ Excel
        </a>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-slate-500">Sales</p>
          <p className="font-bold text-slate-900">{NUM(data?.sales_count)} inv</p>
          <p className="text-sm font-semibold text-emerald-700">{INR(data?.sales_total)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Returns</p>
          <p className="font-bold text-slate-900">{NUM(data?.returns_count)} inv</p>
          <p className="text-sm font-semibold text-rose-700">{INR(data?.returns_total)}</p>
        </div>
        <div className="col-span-2 pt-2 border-t border-black/10">
          <p className="text-xs text-slate-500">Net Revenue</p>
          <p className="text-lg font-bold text-slate-900">
            {INR((data?.sales_total || 0) - (data?.returns_total || 0))}
          </p>
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
    if (!quiet) setLoading(true); else setRefreshing(true);
    axios.get("/api/stats")
      .then((r) => setStats(r.data))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };
  useEffect(() => { load(); }, []);

  const tabCounts = useMemo(() => {
    if (!stats) return {};
    const c = { All: stats.total_invoices };
    stats.platforms?.forEach((p) => { c[p.name] = p.count; });
    return c;
  }, [stats]);

  const filteredMonths = useMemo(() => {
    if (!stats) return [];
    if (activePlatform === "All") return stats.by_month;
    return stats.by_month
      .map((m) => ({ ...m, platforms: m.platforms }))
      .filter((m) => (m.platforms?.[activePlatform] || 0) > 0);
  }, [stats, activePlatform]);

  const filteredStates = useMemo(() => {
    if (!stats) return [];
    return stats.by_state || [];
  }, [stats]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading dashboard…</p>
      </div>
    </div>
  );
  if (!stats) return <div className="p-8 text-red-600">Failed to load stats.</div>;

  const amazonData   = stats.platforms?.find((p) => p.name === "Amazon");
  const flipkartData = stats.platforms?.find((p) => p.name === "Flipkart");

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 md:space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">Amazon &amp; Flipkart — Sales &amp; Returns overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary text-xs px-3 py-1.5">
            {refreshing
              ? <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            Refresh
          </button>
          <a href="/api/excel" download className="btn-primary text-xs px-3 py-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Download All Excel</span>
            <span className="sm:hidden">Excel</span>
          </a>
        </div>
      </div>

      {/* Platform cards */}
      {(amazonData || flipkartData) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {amazonData   && <PlatformCard platform="Amazon"   data={amazonData} />}
          {flipkartData && <PlatformCard platform="Flipkart" data={flipkartData} />}
        </div>
      )}

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Net Revenue"
          value={INR(stats.net_revenue)}
          sub="Sales minus Returns"
          accent="bg-slate-900"
          highlight="ring-slate-300"
          icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Total Sales"
          value={INR(stats.sales_total)}
          sub={`${NUM(stats.sales_count)} invoices`}
          accent="bg-emerald-500"
          icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
        />
        <StatCard
          label="Total Returns"
          value={INR(stats.returns_total)}
          sub={`${NUM(stats.returns_count)} invoices`}
          accent="bg-rose-500"
          icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
        />
        <StatCard
          label="Total GST"
          value={INR((stats.total_cgst || 0) + (stats.total_sgst || 0) + (stats.total_igst || 0))}
          sub={`IGST: ${INR(stats.total_igst)}`}
          accent="bg-purple-500"
          icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>}
        />
      </div>

      {/* Sales vs Returns chart + Platform donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6 lg:col-span-2">
          <h2 className="font-bold text-slate-900 mb-0.5 text-sm sm:text-base">Monthly Sales vs Returns</h2>
          <p className="text-xs text-slate-400 mb-4">Revenue comparison by month</p>
          <SalesVsReturnsChart data={stats.by_month} />
        </div>
        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-slate-900 mb-4 text-sm sm:text-base">Platform Split</h2>
          <StatusPieChart platforms={stats.platforms} />
        </div>
      </div>

      {/* Platform monthly + State-wise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">Monthly by Platform</h2>
              <p className="text-xs text-slate-400 mt-0.5">Filter by platform below</p>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <PlatformTabs active={activePlatform} onChange={setActivePlatform} counts={tabCounts} />
          </div>
          <div className="mt-4">
            <MonthlyBarChart data={filteredMonths} platform={activePlatform} />
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-slate-900 mb-0.5 text-sm sm:text-base">State-wise Breakdown</h2>
          <p className="text-xs text-slate-400 mb-4">Top states by invoice count</p>
          <StateBarChart data={filteredStates} />
        </div>
      </div>

      {/* GST breakdown + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-slate-900 mb-4 text-sm sm:text-base">GST Breakdown</h2>
          <div className="space-y-4">
            {[
              { label: "CGST (9%)", value: stats.total_cgst, color: "bg-blue-500", text: "text-blue-700" },
              { label: "SGST (9%)", value: stats.total_sgst, color: "bg-emerald-500", text: "text-emerald-700" },
              { label: "IGST (18%)", value: stats.total_igst, color: "bg-orange-500", text: "text-orange-700" },
            ].map((g) => {
              const total = (stats.total_cgst || 0) + (stats.total_sgst || 0) + (stats.total_igst || 0);
              const pct = total > 0 ? ((g.value || 0) / total) * 100 : 0;
              return (
                <div key={g.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-semibold text-slate-700">{g.label}</span>
                    <span className={`font-bold ${g.text}`}>{INR(g.value)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${g.color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-4 sm:p-6">
          <h2 className="font-bold text-slate-900 mb-4 text-sm sm:text-base">Recent Activity</h2>
          <StateGraph recent={stats.recent_uploads} />
        </div>
      </div>
    </div>
  );
}
