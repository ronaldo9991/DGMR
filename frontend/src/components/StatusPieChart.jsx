import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#2563EB", "#F97316", "#8B5CF6", "#10B981"];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-bold text-slate-800">{d.name}</p>
      <p className="text-slate-600">{d.value} invoices</p>
      <p className="text-slate-500">₹{Number(d.total).toLocaleString("en-IN")}</p>
    </div>
  );
};

export default function StatusPieChart({ platforms }) {
  const data = (platforms || []).filter((p) => p.count > 0).map((p) => ({
    name: p.name,
    value: p.count,
    total: p.total,
  }));

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
        <svg className="w-10 h-10 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
        <p className="text-sm">No platform data yet</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
            paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-sm font-semibold text-slate-700">{d.name}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">{d.value}</div>
              <div className="text-xs text-slate-400">{((d.value / total) * 100).toFixed(0)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
