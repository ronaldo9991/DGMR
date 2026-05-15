import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line,
} from "recharts";

const fmt = (v) => `₹${Number(v).toLocaleString("en-IN")}`;
const PLATFORM_COLORS = { Amazon: "#2563EB", Flipkart: "#F97316", Other: "#8B5CF6", All: "#0F172A" };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-bold text-slate-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-semibold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function MonthlyBarChart({ data, platform }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-slate-400">
        <svg className="w-10 h-10 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-sm">Upload invoices to see monthly trends</p>
      </div>
    );
  }

  const platforms = platform === "All"
    ? [...new Set(data.flatMap((d) => Object.keys(d.platforms || {})))]
    : [platform];

  const chartData = data.map((d) => ({
    month: d.month,
    ...platforms.reduce((acc, p) => {
      acc[p] = platform === "All" ? (d.platforms?.[p] || 0) : d.total;
      return acc;
    }, {}),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barGap={4} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        {platforms.map((p) => (
          <Bar key={p} dataKey={p} fill={PLATFORM_COLORS[p] || "#6B7280"} radius={[4, 4, 0, 0]} maxBarSize={40} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data, platform }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({ month: d.month, total: d.total, count: d.count }));
  const color = PLATFORM_COLORS[platform] || "#0F172A";

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line type="monotone" dataKey="total" name="Revenue" stroke={color} strokeWidth={2.5}
          dot={{ fill: color, r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default MonthlyBarChart;
