import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import PlatformTabs from "../components/PlatformTabs.jsx";

const AMT_KEYS = new Set(["taxable_value", "cgst9", "sgst9", "igst18"]);
const INR = (v) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

const AMAZON_WAREHOUSES = ["IN", "MAA4", "CJB1"];
const WH_LABELS = { IN: "IN (India)", MAA4: "MAA4 (Chennai)", CJB1: "CJB1 (Coimbatore)" };
const WH_COLORS = {
  IN:   "bg-sky-100 text-sky-700",
  MAA4: "bg-violet-100 text-violet-700",
  CJB1: "bg-teal-100 text-teal-700",
};

const COLS = [
  { key: "platform",        label: "Platform"      },
  { key: "warehouse",       label: "Warehouse"     },
  { key: "transaction_type",label: "Type"          },
  { key: "qty",             label: "QTY"           },
  { key: "party_name",      label: "Party Name"    },
  { key: "gst_number",      label: "GST No"        },
  { key: "inv_no",          label: "INV No"        },
  { key: "inv_date",        label: "Date"          },
  { key: "taxable_value",   label: "Taxable (₹)"  },
  { key: "cgst9",           label: "CGST9"         },
  { key: "sgst9",           label: "SGST9"         },
  { key: "igst18",          label: "IGST18"        },
  { key: "party_address",   label: "State"         },
];

function PlatformBadge({ platform }) {
  if (!platform) return <span className="text-slate-400 text-xs">—</span>;
  const s = {
    Amazon:   "bg-blue-100 text-blue-700",
    Flipkart: "bg-orange-100 text-orange-700",
    Other:    "bg-purple-100 text-purple-700",
  };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s[platform] || "bg-slate-100 text-slate-600"}`}>{platform}</span>;
}

function WarehouseBadge({ warehouse }) {
  if (!warehouse) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${WH_COLORS[warehouse] || "bg-slate-100 text-slate-600"}`}>
      {warehouse}
    </span>
  );
}

function TypeBadge({ type, cancelled, linkedSaleId }) {
  if (cancelled) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cancelled
      </span>
    );
  }
  if (type === "Return") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        Return{linkedSaleId ? ` #${linkedSaleId}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
      </svg>
      Sale
    </span>
  );
}

export default function Records() {
  const [records,        setRecords]        = useState([]);
  const [total,          setTotal]          = useState(0);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [activePlatform, setActivePlatform] = useState("All");
  const [activeWarehouse,setActiveWarehouse]= useState("All");  // All | IN | MAA4 | CJB1
  const [typeFilter,     setTypeFilter]     = useState("All");  // All | Sale | Return
  const [showCancelled,  setShowCancelled]  = useState(false);
  const [deleting,       setDeleting]       = useState(null);

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams({ limit: "500" });
    if (activePlatform !== "All") p.set("platform", activePlatform);
    if (activePlatform === "Amazon" && activeWarehouse !== "All") p.set("warehouse", activeWarehouse);
    if (typeFilter !== "All")     p.set("transaction_type", typeFilter);
    if (search)                   p.set("search", search);
    if (!showCancelled)           p.set("cancelled", "false");
    axios.get(`/api/records?${p}`)
      .then((r) => { setRecords(r.data.records); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activePlatform, activeWarehouse, typeFilter, search, showCancelled]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    setDeleting(id);
    await axios.delete(`/api/records/${id}`);
    setDeleting(null);
    load();
  };

  // Counts for tabs
  const [allForCount, setAllForCount] = useState([]);
  useEffect(() => {
    axios.get("/api/records?limit=5000&cancelled=false")
      .then((r) => setAllForCount(r.data.records));
  }, [records]);

  const tabCounts = useMemo(() => {
    const c = { All: allForCount.length };
    allForCount.forEach((r) => { if (r.platform) c[r.platform] = (c[r.platform] || 0) + 1; });
    return c;
  }, [allForCount]);

  const salesRows  = records.filter((r) => !r.cancelled && r.transaction_type === "Sale");
  const returnRows = records.filter((r) => !r.cancelled && r.transaction_type === "Return");

  const sumRows = (rows) =>
    rows.reduce(
      (acc, r) => ({
        taxable_value: acc.taxable_value + (r.taxable_value || 0),
        cgst9:  acc.cgst9  + (r.cgst9  || 0),
        sgst9:  acc.sgst9  + (r.sgst9  || 0),
        igst18: acc.igst18 + (r.igst18 || 0),
      }),
      { taxable_value: 0, cgst9: 0, sgst9: 0, igst18: 0 }
    );

  const salesTotals   = useMemo(() => sumRows(salesRows),  [salesRows]);
  const returnTotals  = useMemo(() => sumRows(returnRows), [returnRows]);

  // Net = Sales minus Returns
  const totals = useMemo(() => ({
    taxable_value: salesTotals.taxable_value - returnTotals.taxable_value,
    cgst9:  salesTotals.cgst9  - returnTotals.cgst9,
    sgst9:  salesTotals.sgst9  - returnTotals.sgst9,
    igst18: salesTotals.igst18 - returnTotals.igst18,
  }), [salesTotals, returnTotals]);

  const grandTotal = totals.taxable_value + totals.cgst9 + totals.sgst9 + totals.igst18;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Records</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total} row{total !== 1 ? "s" : ""}
            {salesRows.length > 0 && ` · ${salesRows.length} sales`}
            {returnRows.length > 0 && ` · ${returnRows.length} returns`}
          </p>
        </div>
        <a href="/api/excel" download className="btn-primary text-xs px-3 py-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Excel
        </a>
      </div>

      {/* Platform tabs */}
      <PlatformTabs active={activePlatform} onChange={(p) => { setActivePlatform(p); setActiveWarehouse("All"); }} counts={tabCounts} />

      {/* Amazon warehouse tabs */}
      {activePlatform === "Amazon" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Warehouse</span>
          {["All", ...AMAZON_WAREHOUSES].map((wh) => (
            <button
              key={wh}
              onClick={() => setActiveWarehouse(wh)}
              className={`text-xs font-bold px-3 py-1 rounded-full border transition-all ${
                activeWarehouse === wh
                  ? wh === "All"
                    ? "bg-blue-600 text-white border-blue-600"
                    : `border-transparent text-white ${wh === "IN" ? "bg-sky-600" : wh === "MAA4" ? "bg-violet-600" : "bg-teal-600"}`
                  : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
              }`}
            >
              {wh === "All" ? "All Warehouses" : `${wh} — ${wh === "IN" ? "India" : wh === "MAA4" ? "Chennai" : "Coimbatore"}`}
            </button>
          ))}
          {/* Per-warehouse download */}
          {activeWarehouse !== "All" && (
            <a
              href={`/api/excel?platform=Amazon&warehouse=${activeWarehouse}`}
              download
              className="ml-2 text-xs font-semibold px-3 py-1 rounded-full border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
            >
              ⬇ Download {activeWarehouse} Excel
            </a>
          )}
        </div>
      )}

      {/* Type filter + search */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Sale / Return / All toggle */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200">
          {["All", "Sale", "Return"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-bold transition-all ${
                typeFilter === t
                  ? t === "Return"
                    ? "bg-rose-600 text-white"
                    : t === "Sale"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-900 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              } ${t !== "All" ? "border-l border-slate-200" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative">
          <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search name, INV no, GST, state…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)}
            className="rounded border-slate-300 text-blue-600" />
          Show cancelled
        </label>
      </div>

      {/* Summary strip */}
      {records.length > 0 && (
        <div className="space-y-2">
          {/* Net totals row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Net Taxable",  value: INR(totals.taxable_value), cls: "text-slate-900" },
              { label: "CGST + SGST (Net)", value: INR(totals.cgst9 + totals.sgst9), cls: "text-blue-700" },
              { label: "IGST (Net)",   value: INR(totals.igst18), cls: "text-orange-700" },
              { label: "Net Total",    value: INR(grandTotal),    cls: "text-emerald-700 text-base font-extrabold" },
            ].map((s) => (
              <div key={s.label} className="card-sm text-center">
                <p className="text-xs text-slate-500 font-semibold">{s.label}</p>
                <p className={`font-bold mt-1 tabular-nums text-sm ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
          {/* Sales vs Returns breakdown */}
          {(salesRows.length > 0 || returnRows.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-700">Sales ({salesRows.length})</p>
                  <p className="text-sm font-bold text-emerald-800 tabular-nums mt-0.5">
                    {INR(salesTotals.taxable_value + salesTotals.cgst9 + salesTotals.sgst9 + salesTotals.igst18)}
                  </p>
                </div>
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-rose-700">Returns ({returnRows.length})</p>
                  <p className="text-sm font-bold text-rose-800 tabular-nums mt-0.5">
                    {INR(returnTotals.taxable_value + returnTotals.cgst9 + returnTotals.sgst9 + returnTotals.igst18)}
                  </p>
                </div>
                <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto p-0 rounded-2xl">
        <table className="data-table min-w-[1250px]">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className={AMT_KEYS.has(c.key) ? "num" : ""}>{c.label}</th>
              ))}
              <th className="text-center w-10">Del</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={COLS.length + 1} className="py-16 text-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              </td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={COLS.length + 1} className="py-16 text-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm font-medium">No records found</span>
                </div>
              </td></tr>
            ) : (
              records.map((rec) => (
                <tr key={rec.id} className={rec.cancelled ? "opacity-40 bg-red-50" : rec.transaction_type === "Return" ? "bg-rose-50/40" : ""}>
                  {COLS.map((c) => (
                    <td key={c.key} className={AMT_KEYS.has(c.key) ? "num" : ""}>
                      {c.key === "platform" ? (
                        <PlatformBadge platform={rec.platform} />
                      ) : c.key === "warehouse" ? (
                        <WarehouseBadge warehouse={rec.warehouse} />
                      ) : c.key === "transaction_type" ? (
                        <TypeBadge
                          type={rec.transaction_type}
                          cancelled={rec.cancelled}
                          linkedSaleId={rec.linked_sale_id}
                        />
                      ) : c.key === "party_name" ? (
                        <span className="font-medium text-slate-800">{rec.party_name || "—"}</span>
                      ) : AMT_KEYS.has(c.key) ? (
                        INR(rec[c.key])
                      ) : (
                        rec[c.key] ?? "—"
                      )}
                    </td>
                  ))}
                  <td className="text-center">
                    <button onClick={() => handleDelete(rec.id)} disabled={deleting === rec.id}
                      className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center mx-auto transition-colors disabled:opacity-40">
                      {deleting === rec.id
                        ? <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
                        : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {records.length > 0 && (
            <tfoot>
              <tr className="text-xs text-slate-400 font-medium">
                <td colSpan={8} className="px-4 py-1">Sales ({salesRows.length})</td>
                <td className="text-right px-4 py-1 text-emerald-700">{INR(salesTotals.taxable_value)}</td>
                <td className="text-right px-4 py-1 text-emerald-700">{INR(salesTotals.cgst9)}</td>
                <td className="text-right px-4 py-1 text-emerald-700">{INR(salesTotals.sgst9)}</td>
                <td className="text-right px-4 py-1 text-emerald-700">{INR(salesTotals.igst18)}</td>
                <td colSpan={2} />
              </tr>
              <tr className="text-xs text-slate-400 font-medium">
                <td colSpan={8} className="px-4 py-1">Returns ({returnRows.length})</td>
                <td className="text-right px-4 py-1 text-rose-600">−{INR(returnTotals.taxable_value)}</td>
                <td className="text-right px-4 py-1 text-rose-600">−{INR(returnTotals.cgst9)}</td>
                <td className="text-right px-4 py-1 text-rose-600">−{INR(returnTotals.sgst9)}</td>
                <td className="text-right px-4 py-1 text-rose-600">−{INR(returnTotals.igst18)}</td>
                <td colSpan={2} />
              </tr>
              <tr className="border-t-2 border-slate-300">
                <td colSpan={8} className="text-slate-800 font-bold">NET TOTAL</td>
                <td className="text-right font-bold">{INR(totals.taxable_value)}</td>
                <td className="text-right font-bold">{INR(totals.cgst9)}</td>
                <td className="text-right font-bold">{INR(totals.sgst9)}</td>
                <td className="text-right font-bold">{INR(totals.igst18)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
