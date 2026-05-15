import { useEffect, useState } from "react";
import axios from "axios";

const COLS = [
  { key: "invoice_no", label: "Invoice No" },
  { key: "date", label: "Date" },
  { key: "customer_name", label: "Customer" },
  { key: "from_station", label: "From" },
  { key: "to_station", label: "To" },
  { key: "consignment_no", label: "Consignment No" },
  { key: "goods_description", label: "Goods" },
  { key: "weight_kg", label: "Weight (kg)" },
  { key: "freight_amount", label: "Freight (₹)" },
  { key: "gst_percent", label: "GST %" },
  { key: "total_amount", label: "Total (₹)" },
  { key: "type", label: "Type" },
  { key: "payment_status", label: "Status" },
];

function Badge({ type }) {
  if (!type) return null;
  const map = {
    Sale: "badge-sale",
    Return: "badge-return",
    Paid: "badge-paid",
    Pending: "badge-pending",
    Partial: "badge-partial",
  };
  return <span className={map[type] || "badge-pending"}>{type}</span>;
}

export default function Records() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("payment_status", statusFilter);
    axios
      .get(`/api/records?${params}`)
      .then((r) => {
        setRecords(r.data.records);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [search, typeFilter, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    setDeleting(id);
    await axios.delete(`/api/records/${id}`);
    setDeleting(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Records</h1>
          <p className="text-sm text-gray-500 mt-1">{total} extracted invoice{total !== 1 ? "s" : ""}</p>
        </div>
        <a href="/api/excel" download className="btn-primary">
          <span>⬇</span> Download Excel
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search invoice, customer, consignment…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Types</option>
          <option value="Sale">Sale</option>
          <option value="Return">Return</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Partial">Partial</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap"
                >
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLS.length + 1} className="px-4 py-10 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={COLS.length + 1} className="px-4 py-10 text-center text-gray-400">
                  No records found. Upload some invoices to get started.
                </td>
              </tr>
            ) : (
              records.map((rec) => (
                <tr
                  key={rec.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  {COLS.map((c) => (
                    <td key={c.key} className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {c.key === "type" ? (
                        <Badge type={rec.type} />
                      ) : c.key === "payment_status" ? (
                        <Badge type={rec.payment_status} />
                      ) : c.key === "freight_amount" || c.key === "total_amount" ? (
                        rec[c.key] != null
                          ? `₹${Number(rec[c.key]).toLocaleString("en-IN")}`
                          : "—"
                      ) : (
                        rec[c.key] ?? "—"
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(rec.id)}
                      disabled={deleting === rec.id}
                      className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-40"
                    >
                      {deleting === rec.id ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
