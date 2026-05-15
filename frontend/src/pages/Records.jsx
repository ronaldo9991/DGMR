import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import PlatformTabs from "../components/PlatformTabs.jsx";

const AMT_KEYS = new Set(["taxable_value", "cgst9", "sgst9", "igst18"]);
const INR = (v) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

const COLS = [
  { key: "platform", label: "Platform", w: "w-24" },
  { key: "qty", label: "QTY", w: "w-12" },
  { key: "party_name", label: "Party Name", w: "w-44" },
  { key: "gst_number", label: "GST Number", w: "w-36" },
  { key: "inv_no", label: "INV No", w: "w-16" },
  { key: "inv_date", label: "Date", w: "w-24" },
  { key: "taxable_value", label: "Taxable (₹)", w: "w-32" },
  { key: "cgst9", label: "CGST9", w: "w-28" },
  { key: "sgst9", label: "SGST9", w: "w-28" },
  { key: "igst18", label: "IGST18", w: "w-28" },
  { key: "party_address", label: "State", w: "w-36" },
];

function PlatformBadge({ platform }) {
  if (!platform) return <span className="text-slate-400 text-xs">—</span>;
  const styles = {
    Amazon: "bg-blue-100 text-blue-700",
    Flipkart: "bg-orange-100 text-orange-700",
    Other: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles[platform] || "bg-slate-100 text-slate-600"}`}>
      {platform}
    </span>
  );
}

export default function Records() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activePlatform, setActivePlatform] = useState("All");
  const [showCancelled, setShowCancelled] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "500" });
    if (activePlatform !== "All") params.set("platform", activePlatform);
    if (search) params.set("search", search);
    if (!showCancelled) params.set("cancelled", "false");
    axios
      .get(`/api/records?${params}`)
      .then((r) => { setRecords(r.data.records); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activePlatform, search, showCancelled]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    setDeleting(id);
    await axios.delete(`/api/records/${id}`);
    setDeleting(null);
    load();
  };

  // Tab counts — load all platforms for counts
  const [allRecords, setAllRecords] = useState([]);
  useEffect(() => {
    axios.get("/api/records?limit=5000&cancelled=false")
      .then((r) => setAllRecords(r.data.records));
  }, [records]);

  const tabCounts = useMemo(() => {
    const counts = { All: allRecords.length };
    allRecords.forEach((r) => {
      if (r.platform) counts[r.platform] = (counts[r.platform] || 0) + 1;
    });
    return counts;
  }, [allRecords]);

  const totals = useMemo(() =>
    records.reduce((acc, r) => ({
      taxable_value: acc.taxable_value + (r.taxable_value || 0),
      cgst9: acc.cgst9 + (r.cgst9 || 0),
      sgst9: acc.sgst9 + (r.sgst9 || 0),
      igst18: acc.igst18 + (r.igst18 || 0),
    }), { taxable_value: 0, cgst9: 0, sgst9: 0, igst18: 0 }),
  [records]);

  const grandTotal = totals.taxable_value + totals.cgst9 + totals.sgst9 + totals.igst18;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Records</h1>
          <p className="text-slate-500 text-sm mt-1">{total} invoice row{total !== 1 ? "s" : ""} in view</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/excel${activePlatform !== "All" ? `?platform=${activePlatform}` : ""}`}
            download
            className="btn-primary text-xs px-3 py-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Excel
          </a>
        </div>
      </div>

      {/* Platform tabs */}
      <PlatformTabs active={activePlatform} onChange={setActivePlatform} counts={tabCounts} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search name, INV no, GST, state…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showCancelled}
            onChange={(e) => setShowCancelled(e.target.checked)}
            className="rounded border-slate-300 text-blue-600"
          />
          Show cancelled
        </label>
      </div>

      {/* Summary strip */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Taxable Total", value: INR(totals.taxable_value), color: "text-slate-900" },
            { label: "CGST + SGST", value: INR(totals.cgst9 + totals.sgst9), color: "text-blue-700" },
            { label: "IGST Total", value: INR(totals.igst18), color: "text-orange-700" },
            { label: "Grand Total", value: INR(grandTotal), color: "text-emerald-700 text-lg" },
          ].map((s) => (
            <div key={s.label} className="card-sm text-center">
              <p className="text-xs text-slate-500 font-semibold">{s.label}</p>
              <p className={`font-bold mt-1 tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto p-0 rounded-2xl">
        <table className="data-table">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className={AMT_KEYS.has(c.key) ? "num" : ""}>{c.label}</th>
              ))}
              <th className="text-center">Del</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLS.length + 1} className="py-16 text-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={COLS.length + 1} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm font-medium">No records found</span>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((rec) => (
                <tr key={rec.id} className={rec.cancelled ? "opacity-40" : ""}>
                  {COLS.map((c) => (
                    <td key={c.key} className={AMT_KEYS.has(c.key) ? "num" : ""}>
                      {c.key === "platform" ? (
                        <PlatformBadge platform={rec.platform} />
                      ) : AMT_KEYS.has(c.key) ? (
                        INR(rec[c.key])
                      ) : c.key === "party_name" ? (
                        <span className="font-medium text-slate-800">
                          {rec.party_name || "—"}
                          {rec.cancelled && <span className="ml-2 text-xs font-bold text-red-500">CANCEL</span>}
                        </span>
                      ) : (
                        rec[c.key] ?? "—"
                      )}
                    </td>
                  ))}
                  <td className="text-center">
                    <button
                      onClick={() => handleDelete(rec.id)}
                      disabled={deleting === rec.id}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center mx-auto transition-colors disabled:opacity-40"
                    >
                      {deleting === rec.id ? (
                        <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {records.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6} className="text-slate-700">
                  TOTAL — {records.length} row{records.length !== 1 ? "s" : ""}
                </td>
                <td className="text-right">{INR(totals.taxable_value)}</td>
                <td className="text-right">{INR(totals.cgst9)}</td>
                <td className="text-right">{INR(totals.sgst9)}</td>
                <td className="text-right">{INR(totals.igst18)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
