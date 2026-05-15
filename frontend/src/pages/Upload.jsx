import { useState, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

const ACCEPTED = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/tiff": [".tiff"],
  "image/bmp": [".bmp"],
  "image/webp": [".webp"],
};

/* ── Sale / Return selector ─────────────────────────────────────────── */
function TypeToggle({ value, onChange }) {
  return (
    <div className="flex rounded-xl overflow-hidden border border-slate-200 w-fit">
      <button
        type="button"
        onClick={() => onChange("Sale")}
        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all ${
          value === "Sale"
            ? "bg-emerald-600 text-white shadow-inner"
            : "bg-white text-slate-500 hover:bg-slate-50"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M12 4v16m8-8H4" />
        </svg>
        Sale
      </button>
      <div className="w-px bg-slate-200" />
      <button
        type="button"
        onClick={() => onChange("Return")}
        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all ${
          value === "Return"
            ? "bg-rose-600 text-white shadow-inner"
            : "bg-white text-slate-500 hover:bg-slate-50"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        Return
      </button>
    </div>
  );
}

/* ── Per-file step bar ───────────────────────────────────────────────── */
const STEPS = ["Queued", "Uploading", "Extracting", "Done"];
const STEP_IDX = { queued: 0, uploading: 1, extracting: 2, done: 3, error: 2 };

function StepBar({ status }) {
  const current = STEP_IDX[status] ?? 0;
  const isErr = status === "error";
  return (
    <div className="flex items-center gap-0 mt-3">
      {STEPS.map((label, i) => {
        const done   = i < current || (status === "done");
        const active = i === current && !isErr;
        const err    = isErr && i === current;
        return (
          <div key={label} className="flex-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              <div className={`flex-1 h-1 ${i === 0 ? "invisible" : (done || active) ? (err ? "bg-rose-300" : "bg-emerald-400") : "bg-slate-200"}`} />
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${
                err    ? "bg-rose-500 text-white" :
                done   ? "bg-emerald-500 text-white" :
                active ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                         "bg-slate-200 text-slate-400"
              }`}>
                {done && !err
                  ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  : err ? "!" : i + 1}
              </div>
              <div className={`flex-1 h-1 ${i === STEPS.length - 1 ? "invisible" : done ? "bg-emerald-400" : "bg-slate-200"}`} />
            </div>
            <span className={`text-[10px] mt-1 font-semibold ${
              err ? "text-rose-500" : done || active ? "text-slate-600" : "text-slate-300"
            }`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

const INR = (v) =>
  v != null ? `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

/* ── File card ───────────────────────────────────────────────────────── */
function FileCard({ file, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const processed = file.status === "done" && file.result?.status === "processed";
  const isErr = file.status === "error" || file.result?.status === "error";
  const isReturn = file.result?.transaction_type === "Return";
  const cancelled = file.result?.sales_cancelled?.length ?? 0;
  const invoices = file.result?.invoices ?? [];
  const multiRow = invoices.length > 1;

  return (
    <div className={`rounded-xl border transition-all ${
      processed ? (isReturn ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50")
      : isErr ? "border-red-200 bg-red-50"
      : "border-slate-200 bg-white"
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            processed ? (isReturn ? "bg-rose-100" : "bg-emerald-100")
            : isErr ? "bg-red-100" : "bg-slate-100"
          }`}>
            <svg className={`w-5 h-5 ${processed ? (isReturn ? "text-rose-600" : "text-emerald-600") : isErr ? "text-red-500" : "text-slate-500"}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800 truncate max-w-[220px]">{file.name}</p>
              {(file.status === "queued" || isErr) && (
                <button onClick={() => onRemove(file.id)} className="text-slate-400 hover:text-red-500 p-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {file.result?.platform && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${
                  file.result.platform === "Amazon" ? "bg-blue-600"
                  : file.result.platform === "Flipkart" ? "bg-orange-500"
                  : "bg-slate-600"
                }`}>{file.result.platform}</span>
              )}
              {processed && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isReturn ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                }`}>
                  {isReturn ? "↩ Return" : "✓ Sale"} · {file.result.rows_added} invoice{file.result.rows_added !== 1 ? "s" : ""}
                </span>
              )}
              {cancelled > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {cancelled} sale{cancelled !== 1 ? "s" : ""} cancelled
                </span>
              )}
            </div>
          </div>
        </div>

        <StepBar status={file.status} />

        {isErr && (
          <p className="text-xs text-red-600 mt-2 font-medium">
            {file.error || file.result?.error || "Extraction failed"}
          </p>
        )}

        {/* Expand toggle for multi-invoice documents */}
        {processed && multiRow && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors ${
              isReturn ? "text-rose-600 hover:text-rose-800" : "text-emerald-700 hover:text-emerald-900"
            }`}
          >
            <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            {expanded ? "Hide" : "Show"} {invoices.length} extracted invoices
          </button>
        )}
      </div>

      {/* Invoice breakdown table */}
      {processed && multiRow && expanded && (
        <div className="border-t border-slate-200 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-500 font-semibold">
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">INV No</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Party</th>
                <th className="px-3 py-2 text-right">Taxable (₹)</th>
                <th className="px-3 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={i} className={`border-t border-slate-100 ${inv.cancelled ? "opacity-50" : ""}`}>
                  <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-1.5 font-mono font-semibold text-slate-700">{inv.inv_no || "—"}</td>
                  <td className="px-3 py-1.5 text-slate-500">{inv.inv_date || "—"}</td>
                  <td className="px-3 py-1.5 text-slate-700 max-w-[140px] truncate">{inv.party_name || "—"}</td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-800">{INR(inv.taxable_value)}</td>
                  <td className="px-3 py-1.5 text-center">
                    {inv.cancelled
                      ? <span className="text-red-500 font-bold">Cancelled</span>
                      : <span className={`font-bold ${isReturn ? "text-rose-600" : "text-emerald-600"}`}>
                          {isReturn ? "Return" : "Sale"}
                        </span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={4} className="px-3 py-1.5 font-bold text-slate-600">Total</td>
                <td className="px-3 py-1.5 text-right font-bold text-slate-900 tabular-nums">
                  {INR(invoices.reduce((s, inv) => s + (inv.taxable_value || 0), 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function Upload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [transactionType, setTransactionType] = useState("Sale");

  const onDrop = useCallback((accepted) => {
    setFiles((prev) => [
      ...prev,
      ...accepted.map((f) => ({
        id: Math.random().toString(36).slice(2),
        name: f.name, file: f,
        status: "queued", result: null, error: null,
      })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: ACCEPTED, multiple: true,
  });

  const updateFile = (id, patch) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeFile = (id) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const processFiles = async () => {
    const queued = files.filter((f) => f.status === "queued");
    if (!queued.length) return;
    setUploading(true);

    queued.forEach((f) => updateFile(f.id, { status: "uploading" }));
    await new Promise((r) => setTimeout(r, 300));
    queued.forEach((f) => updateFile(f.id, { status: "extracting" }));

    try {
      const form = new FormData();
      queued.forEach((f) => form.append("files", f.file));
      form.append("transaction_type", transactionType);

      const { data } = await axios.post("/api/upload", form, { timeout: 180_000 });

      queued.forEach((f, idx) => {
        const result = data.results?.[idx] ?? { status: "error", error: "No result returned" };
        updateFile(f.id, { status: "done", result });
      });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Upload failed";
      queued.forEach((f) => updateFile(f.id, { status: "error", error: msg }));
    }

    setUploading(false);
  };

  const clearAll  = () => !uploading && setFiles([]);
  const clearDone = () => setFiles((prev) => prev.filter((f) => f.status !== "done"));

  const queuedCount = files.filter((f) => f.status === "queued").length;
  const doneCount   = files.filter((f) => f.status === "done").length;
  const totalRows   = files.reduce((s, f) => s + (f.result?.rows_added || 0), 0);
  const totalCancelled = files.reduce((s, f) => s + (f.result?.sales_cancelled?.length || 0), 0);

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-2xl space-y-5 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Upload Invoices</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            GPT-4o Vision reads every row from your invoice. Select the document type before uploading.
          </p>
        </div>

        {/* Type toggle — prominent */}
        <div className={`rounded-2xl border-2 p-5 transition-colors ${
          transactionType === "Return"
            ? "border-rose-300 bg-rose-50"
            : "border-emerald-300 bg-emerald-50"
        }`}>
          <p className="text-sm font-bold text-slate-700 mb-3">Document type</p>
          <TypeToggle value={transactionType} onChange={setTransactionType} />
          <p className={`text-xs mt-3 font-medium ${
            transactionType === "Return" ? "text-rose-600" : "text-emerald-700"
          }`}>
            {transactionType === "Return"
              ? "⚠ Return document — matching sale invoices will be automatically cancelled"
              : "✓ Sale document — invoices will be added as new sale records"}
          </p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer transition-all ${
            isDragActive
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
          }`}
        >
          <input {...getInputProps()} />
          <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
            isDragActive ? "bg-blue-100" : "bg-slate-100"
          }`}>
            <svg className={`w-7 h-7 ${isDragActive ? "text-blue-600" : "text-slate-400"}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="font-semibold text-slate-800 text-base">
            {isDragActive ? "Drop files here" : "Drop multiple invoice files"}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            or click to browse — <span className="font-semibold text-slate-500">select 5 or more at once</span>
          </p>
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            {["PDF", "PNG", "JPG", "TIFF"].map((e) => (
              <span key={e} className="text-xs bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-md">{e}</span>
            ))}
          </div>
        </div>

        {/* Action bar */}
        {files.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={processFiles}
              disabled={uploading || queuedCount === 0}
              className={`btn disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm ${
                transactionType === "Return"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {uploading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
              ) : (
                <>{transactionType === "Return" ? "↩" : "✓"} Process {queuedCount} file{queuedCount !== 1 ? "s" : ""}</>
              )}
            </button>
            {doneCount > 0 && <button onClick={clearDone} disabled={uploading} className="btn-secondary">Clear done</button>}
            <button onClick={clearAll} disabled={uploading} className="btn-secondary text-rose-500 hover:text-rose-600">Clear all</button>
            <div className="flex items-center gap-3">
              {totalRows > 0 && (
                <span className="text-sm font-semibold text-emerald-700">
                  +{totalRows} row{totalRows !== 1 ? "s" : ""} added
                </span>
              )}
              {totalCancelled > 0 && (
                <span className="text-sm font-semibold text-amber-700">
                  {totalCancelled} sale{totalCancelled !== 1 ? "s" : ""} cancelled
                </span>
              )}
            </div>
          </div>
        )}

        {/* File queue summary */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap text-xs font-semibold text-slate-500">
              {queuedCount > 0 && (
                <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                  {queuedCount} queued
                </span>
              )}
              {files.filter((f) => f.status === "extracting" || f.status === "uploading").length > 0 && (
                <span className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  {files.filter((f) => f.status === "extracting" || f.status === "uploading").length} processing
                </span>
              )}
              {doneCount > 0 && (
                <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {doneCount} done
                </span>
              )}
              {files.filter((f) => f.status === "error").length > 0 && (
                <span className="flex items-center gap-1.5 bg-red-100 text-red-600 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  {files.filter((f) => f.status === "error").length} failed
                </span>
              )}
            </div>
            {files.map((f) => <FileCard key={f.id} file={f} onRemove={removeFile} />)}
          </div>
        )}

        {/* Hint card */}
        {files.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-bold text-slate-700 mb-3">How it works</p>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">1</span>
                <span>Select <b>Sale</b> or <b>Return</b> above — applies to all files in this batch</span>
              </div>
              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">2</span>
                <span>Drop your Amazon or Flipkart invoice image/PDF — GPT-4o reads every row</span>
              </div>
              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">3</span>
                <span>For <b>Returns</b>: the matching Sale invoice is automatically cancelled by INV NO</span>
              </div>
              <div className="flex gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">4</span>
                <span>Excel downloads with separate Sales, Returns &amp; combined sheets per platform</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
