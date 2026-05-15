import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

const INR = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const count = payload[0]?.payload?.count;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-bold text-slate-800 mb-1">{label}</p>
      {count != null && (
        <p className="text-slate-400 text-[10px] mb-1.5">{count} invoice{count !== 1 ? "s" : ""}</p>
      )}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-600">{p.name}</span>
          </div>
          <span className="font-semibold tabular-nums">{INR(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function StateBarChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-slate-400">
        <svg className="w-10 h-10 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm">Upload invoices to see state-wise data</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    state: d.state,
    Sales: d.sales_total,
    Returns: d.returns_total,
    count: d.count,
  }));

  // Dynamically size the chart height based on number of states
  const chartHeight = Math.max(220, chartData.length * 32);

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 20, left: 4, bottom: 4 }}
        barSize={10}
        barGap={3}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 10, fill: "#94A3B8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="state"
          width={130}
          tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Sales"   fill="#16A34A" radius={[0, 4, 4, 0]} />
        <Bar dataKey="Returns" fill="#E11D48" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
