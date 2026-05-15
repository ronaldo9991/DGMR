import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = { Paid: "#10B981", Pending: "#F59E0B", Partial: "#3B82F6" };

export default function StatusPieChart({ breakdown }) {
  const data = Object.entries(breakdown || {})
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No payment data yet.
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
          innerRadius={65}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] || "#6B7280"} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${v} invoices`]} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
