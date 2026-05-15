import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#1A56DB", "#F97316", "#8B5CF6", "#10B981", "#F59E0B"];

export default function StatusPieChart({ platforms }) {
  const data = (platforms || []).filter((p) => p.count > 0).map((p) => ({
    name: p.name,
    value: p.count,
    total: p.total,
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No platform data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name, props) => [
            `${value} invoices · ₹${Number(props.payload.total).toLocaleString("en-IN")}`,
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
