import { useEffect, useState } from "react";
import axios from "axios";

const COLS = [
  { key: "platform", label: "Platform" },
  { key: "qty", label: "QTY" },
  { key: "party_name", label: "PARTY NAME" },
  { key: "gst_number", label: "GST NUMBER" },
  { key: "inv_no", label: "INV NO" },
  { key: "inv_date", label: "INV DATE" },
  { key: "taxable_value", label: "TAXABLE VALUE" },
  { key: "cgst9", label: "CGST9" },
  { key: "sgst9", label: "SGST9" },
  { key: "igst18", label: "IGST18" },
  { key: "party_address", label: "PARTY ADDRESS" },
];

const AMT_KEYS = new Set(["taxable_value", "cgst9", "sgst9", "igst18"]);
const PLATFORM_COLOR = {
  Flipkart: "bg-orange-100 text-orange-700",
  Amazon: "bg-blue-100 text-blue-700",
  Other: "bg-purple-100 text-purple-700",
};

const fmt = (v) => (v != null ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—");

export default function Records() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (platformFilter) params.set("platform", platformFilter);
    if (!showCancelled) params.set("cancelled", "false");
    axios
      .get(`/api/records?${params}&limit=500`)
      .then((r) => { setRecords(r.data.records); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, platformFilter, showCancelled]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    setDeleting(id);
    await axios.delete(`/api/records/${id}`);
    setDeleting(null);
    load();
  };

  // Totals for visible rows
  const totals = records.reduce(
    (acc, r) => {
      acc.taxable_value += r.taxable_value || 0;
      acc.cgst9 += r.cgst9 || 0;
      acc.sgst9 += r.sgst9 || 0;
      acc.igst18 += r.igst18 || 0;
      return acc;
    },
    { taxable_value: 0, cgst9: 0, sgst9: 0, igst18: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Records</h1>
          <p className="text-sm text-gray-500 mt-1">{total} invoice row{total !== 1 ? "s" : ""}</p>
        </div>
        <a href="/api/excel" download className="btn-primary">
          <span>⬇</span> Download Excel
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search name, INV NO, GST, state…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Platforms</option>
          <option value="Amazon">Amazon</option>
          <option value="Flipkart">Flipkart</option>
          <option value="Other">Other</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
            className="rounded"
          />
          Show cancelled
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {COLS.map((c) => (
                <th key={c.key} className={`px-3 py-3 font-semibold text-gray-600 whitespace-nowrap text-left ${
                  AMT_KEYS.has(c.key) ? "text-right" : ""
                }`}>{c.label}</th>
              ))}
              <th className="px-3 py-3 text-gray-600 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={COLS.length + 1} className="px-4 py-10 text-center text-gray-400">Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={COLS.length + 1} className="px-4 py-10 text-center text-gray-400">No records found. Upload invoices to get started.</td></tr>
            ) : (
              <>
                {records.map((rec) => (
                  <tr
                    key={rec.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${rec.cancelled ? "opacity-50" : ""}`}
                  >
                    {COLS.map((c) => (
                      <td key={c.key} className={`px-3 py-2.5 whitespace-nowrap text-gray-700 ${
                        AMT_KEYS.has(c.key) ? "text-right tabular-nums" : ""
                      }`}>
                        {c.key === "platform" ? (
                          rec.platform ? (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLATFORM_COLOR[rec.platform] || "bg-gray-100 text-gray-700"}`}>
                              {rec.platform}
                            </span>
                          ) : "—"
                        ) : AMT_KEYS.has(c.key) ? (
                          fmt(rec[c.key])
                        ) : (
                          rec[c.key] ?? "—"
                        )}
                        {c.key === "party_name" && rec.cancelled && (
                          <span className="ml-2 text-xs text-red-500 font-semibold">CANCEL</span>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => handleDelete(rec.id)}
                        disabled={deleting === rec.id}
                        className="text-red-400 hover:text-red-600 text-xs font-medium disabled:opacity-40"
                      >
                        {deleting === rec.id ? "…" : "✕"}
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-yellow-50 font-semibold border-t-2 border-yellow-200">
                  <td colSpan={6} className="px-3 py-2.5 text-gray-700">TOTAL ({records.length} rows)</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">{fmt(totals.taxable_value)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">{fmt(totals.cgst9)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">{fmt(totals.sgst9)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">{fmt(totals.igst18)}</td>
                  <td colSpan={2} />
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
