import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const fmt = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

export default function SalesReturnChart({ data, platforms }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No monthly data yet — upload invoices to see trends.
      </div>
    );
  }

  const COLORS = { Flipkart: "#F97316", Amazon: "#1A56DB", Other: "#8B5CF6" };
  const bars = platforms && platforms.length > 0 ? platforms : ["Flipkart", "Amazon"];

  // Flatten platform data into chart rows
  const chartData = data.map((d) => {
    const row = { month: d.month };
    bars.forEach((p) => {
      row[p] = d.platforms?.[p] || 0;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => fmt(value)} />
        <Legend />
        {bars.map((p) => (
          <Bar key={p} dataKey={p} name={p} fill={COLORS[p] || "#6B7280"} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
