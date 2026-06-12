import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const INR = (v) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

function PlatformBadge({ platform }) {
  const s = {
    Amazon: "bg-blue-100 text-blue-700",
    Flipkart: "bg-orange-100 text-orange-700",
    Other: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s[platform] || "bg-slate-100 text-slate-600"}`}>
      {platform || "—"}
    </span>
  );
}

/* ── Modal to link a return to its original sale ─────────────────────────── */
function LinkModal({ ret, onClose, onLinked }) {
  const [q, setQ] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(null);

  const search = useCallback((query) => {
    setLoading(true);
    axios
      .get(`/api/returns/${ret.id}/candidates`, { params: query ? { q: query } : {} })
      .then((r) => setCandidates(r.data.candidates || []))
      .finally(() => setLoading(false));
  }, [ret.id]);

  useEffect(() => { search(""); }, [search]);

  const doLink = (saleId) => {
    setLinking(saleId);
    axios
      .post(`/api/returns/${ret.id}/link`, { sale_id: saleId })
      .then((r) => onLinked(r.data))
      .finally(() => setLinking(null));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Link return to its original sale</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Return <b>{ret.inv_no}</b> · {ret.inv_date} · {INR(ret.taxable_value)}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(q)}
            placeholder="Search sales by invoice no. or party name"
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-400 focus:outline-none"
          />
          <button onClick={() => search(q)} className="btn-primary text-xs px-4">Search</button>
        </div>

        {/* Candidates */}
        <div className="max-h-72 overflow-y-auto space-y-1.5">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Searching…</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No matching sales found. Try a different search.</p>
          ) : (
            candidates.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <PlatformBadge platform={s.platform} />
                    {s.warehouse && <span className="text-[10px] font-bold text-slate-500">{s.warehouse}</span>}
                    <span className="text-sm font-semibold text-slate-800 truncate">{s.inv_no}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {s.inv_date} · {s.month_label} · {s.party_name || "—"} · {INR(s.taxable_value)}
                  </p>
                </div>
                <button
                  onClick={() => doLink(s.id)}
                  disabled={linking === s.id}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {linking === s.id ? "Linking…" : "Link"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReturnsMatch() {
  const [data, setData] = useState({ returns: [], counts: { linked: 0, unmatched: 0, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("unmatched"); // unmatched | linked | all
  const [modalRet, setModalRet] = useState(null);
  const [migrating, setMigrating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = filter === "all" ? {} : { status: filter };
    axios.get("/api/returns", { params })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const unlink = (id) => {
    axios.post(`/api/returns/${id}/unlink`).then(load);
  };

  const runMigration = () => {
    if (!window.confirm(
      "This un-cancels any sale that has a return linked to it, so April sale + May return net correctly. Safe to run more than once. Continue?"
    )) return;
    setMigrating(true);
    axios.post("/api/returns/migrate-uncancel")
      .then((r) => {
        alert(`Done. Un-cancelled ${r.data.uncancelled} sale(s) across ${r.data.linked_sales} linked return(s).`);
        load();
      })
      .finally(() => setMigrating(false));
  };

  const { counts } = data;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Returns Matching</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-xl">
            Link each return to the sale it reverses. A return is then counted in the
            <b> sale's month</b> — so an April sale returned in May still nets out under April.
          </p>
        </div>
        <button
          onClick={runMigration}
          disabled={migrating}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          {migrating ? "Fixing…" : "Fix historical data"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 max-w-md">
        {[
          { k: "unmatched", label: "Unmatched", val: counts.unmatched, cls: "border-rose-200 bg-rose-50 text-rose-700" },
          { k: "linked", label: "Linked", val: counts.linked, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
          { k: "all", label: "Total", val: counts.total, cls: "border-slate-200 bg-slate-50 text-slate-700" },
        ].map((c) => (
          <button
            key={c.k}
            onClick={() => setFilter(c.k)}
            className={`rounded-2xl border-2 p-3 text-left transition-all ${c.cls} ${filter === c.k ? "ring-2 ring-offset-1 ring-blue-400" : "opacity-90 hover:opacity-100"}`}
          >
            <div className="text-2xl font-black">{c.val}</div>
            <div className="text-xs font-bold uppercase tracking-wide">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-semibold px-3 py-2.5">Return</th>
              <th className="text-left font-semibold px-3 py-2.5">Return date</th>
              <th className="text-left font-semibold px-3 py-2.5">Linked sale</th>
              <th className="text-left font-semibold px-3 py-2.5">Counts in</th>
              <th className="text-right font-semibold px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-slate-400 py-10">Loading…</td></tr>
            ) : data.returns.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-slate-400 py-10">
                {filter === "unmatched" ? "🎉 No unmatched returns — everything is linked." : "No returns."}
              </td></tr>
            ) : (
              data.returns.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={r.platform} />
                      {r.warehouse && <span className="text-[10px] font-bold text-slate-500">{r.warehouse}</span>}
                      <span className="font-semibold text-slate-800">{r.inv_no || "—"}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{r.party_name || "—"} · {INR(r.taxable_value)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{r.inv_date || "—"}</td>
                  <td className="px-3 py-2.5">
                    {r.linked_sale ? (
                      <div>
                        <span className="font-semibold text-slate-800">{r.linked_sale.inv_no}</span>
                        <span className="text-xs text-slate-400"> · {r.linked_sale.inv_date}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">Unmatched</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.linked_sale ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {r.effective_month_label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => setModalRet(r)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {r.linked_sale ? "Change" : "Link"}
                    </button>
                    {r.linked_sale && (
                      <button
                        onClick={() => unlink(r.id)}
                        className="ml-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600"
                      >
                        Unlink
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalRet && (
        <LinkModal
          ret={modalRet}
          onClose={() => setModalRet(null)}
          onLinked={() => { setModalRet(null); load(); }}
        />
      )}
    </div>
  );
}
