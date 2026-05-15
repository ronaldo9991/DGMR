import { useState, useCallback } from "react";
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

const PLATFORM_STYLES = {
  Amazon: { bg: "bg-blue-600", light: "bg-blue-50 border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  Flipkart: { bg: "bg-orange-500", light: "bg-orange-50 border-orange-200", text: "text-orange-700", dot: "bg-orange-500" },
  "Auto-detect": { bg: "bg-slate-700", light: "bg-slate-50 border-slate-200", text: "text-slate-700", dot: "bg-slate-500" },
};

function StepBar({ status, error }) {
  const STEPS = [
    { id: "queued", label: "Queued" },
    { id: "uploading", label: "Uploading" },
    { id: "extracting", label: "Extracting" },
    { id: "done", label: "Done" },
  ];
  const ORDER = ["queued", "uploading", "extracting", "done"];
  const currentIdx = error ? ORDER.indexOf("extracting") : ORDER.indexOf(status);

  return (
    <div className="flex items-center gap-0 mt-3">
      {STEPS.map((step, i) => {
        const done = i < currentIdx || (status === "done" && !error);
        const active = i === currentIdx && !error;
        const isErr = error && i === currentIdx;
        return (
          <div key={step.id} className="flex-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              <div className={`flex-1 h-1 ${i === 0 ? "invisible" : done || active ? (isErr ? "bg-red-300" : "bg-blue-400") : "bg-slate-200"}`} />
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all ${
                isErr ? "bg-red-500 text-white" :
                done ? "bg-blue-600 text-white" :
                active ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                "bg-slate-200 text-slate-400"
              }`}>
                {done && !isErr ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isErr ? "!" : i + 1}
              </div>
              <div className={`flex-1 h-1 ${i === STEPS.length - 1 ? "invisible" : done ? "bg-blue-400" : "bg-slate-200"}`} />
            </div>
            <span className={`text-[10px] mt-1 font-semibold ${
              isErr ? "text-red-500" : done || active ? "text-blue-600" : "text-slate-400"
            }`}>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function FileCard({ file, onRemove }) {
  const isProcessed = file.status === "done" && file.result?.status === "processed";
  const isError = file.status === "error" || file.result?.status === "error";
  const platform = file.result?.platform;

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      isProcessed ? "border-emerald-200 bg-emerald-50" :
      isError ? "border-red-200 bg-red-50" :
      "border-slate-200 bg-white"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          {/* File icon */}
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isProcessed ? "bg-emerald-100" : isError ? "bg-red-100" : "bg-slate-100"
          }`}>
            <svg className={`w-5 h-5 ${isProcessed ? "text-emerald-600" : isError ? "text-red-500" : "text-slate-500"}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate max-w-[220px]">{file.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {platform && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${
                  platform === "Amazon" ? "bg-blue-600" : platform === "Flipkart" ? "bg-orange-500" : "bg-slate-600"
                }`}>{platform}</span>
              )}
              {isProcessed && (
                <span className="text-xs font-semibold text-emerald-700">
                  {file.result.rows_added} row{file.result.rows_added !== 1 ? "s" : ""} extracted
                </span>
              )}
            </div>
          </div>
        </div>
        {(file.status === "queued" || isError) && (
          <button onClick={() => onRemove(file.id)}
            className="text-slate-400 hover:text-red-500 transition-colors p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <StepBar status={file.status} error={isError} />

      {isError && (
        <p className="text-xs text-red-600 mt-2 font-medium">
          {file.error || file.result?.error || "Extraction failed"}
        </p>
      )}

      {isProcessed && file.result && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {file.result.rows_added > 0 && (
            <span className="text-slate-500 col-span-2">
              Successfully extracted <b className="text-slate-800">{file.result.rows_added} invoice{file.result.rows_added !== 1 ? "s" : ""}</b>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      file: f,
      status: "queued",
      result: null,
      error: null,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
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

    for (const f of queued) {
      updateFile(f.id, { status: "uploading" });
      await new Promise((r) => setTimeout(r, 400));
      updateFile(f.id, { status: "extracting" });

      try {
        const form = new FormData();
        form.append("files", f.file);
        const { data } = await axios.post("/api/upload", form);
        updateFile(f.id, { status: "done", result: data.results?.[0] });
      } catch (err) {
        updateFile(f.id, {
          status: "error",
          error: err.response?.data?.detail || err.message || "Upload failed",
        });
      }
    }
    setUploading(false);
  };

  const clearAll = () => !uploading && setFiles([]);
  const clearDone = () => setFiles((prev) => prev.filter((f) => f.status !== "done"));

  const queuedCount = files.filter((f) => f.status === "queued").length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const totalRows = files.reduce((s, f) => s + (f.result?.rows_added || 0), 0);

  return (
    <div className="p-8">
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upload Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">
            GPT-4o Vision automatically extracts all invoice rows from your documents.
          </p>
        </div>

        {/* Platform info banner */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
            <span className="text-sm font-semibold text-blue-700">Amazon</span>
            <span className="text-xs text-blue-500 font-medium">Auto-detected from document</span>
          </div>
          <div className="flex-1 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"></span>
            <span className="text-sm font-semibold text-orange-700">Flipkart</span>
            <span className="text-xs text-orange-500 font-medium">Auto-detected from document</span>
          </div>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            isDragActive
              ? "border-blue-400 bg-blue-50"
              : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
          }`}
        >
          <input {...getInputProps()} />
          <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all ${
            isDragActive ? "bg-blue-100" : "bg-slate-100"
          }`}>
            <svg className={`w-7 h-7 transition-colors ${isDragActive ? "text-blue-600" : "text-slate-500"}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="font-semibold text-slate-800 text-base">
            {isDragActive ? "Drop files here" : "Drop invoice files here"}
          </p>
          <p className="text-slate-400 text-sm mt-1">or click to browse files</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {["PDF", "PNG", "JPG", "TIFF"].map((ext) => (
              <span key={ext} className="text-xs bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-md">{ext}</span>
            ))}
          </div>
        </div>

        {/* Action bar */}
        {files.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={processFiles}
              disabled={uploading || queuedCount === 0}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Processing…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Process {queuedCount} file{queuedCount !== 1 ? "s" : ""}
                </>
              )}
            </button>

            {doneCount > 0 && (
              <button onClick={clearDone} disabled={uploading} className="btn-secondary">
                Clear done
              </button>
            )}
            <button onClick={clearAll} disabled={uploading} className="btn-secondary text-red-500 hover:text-red-600">
              Clear all
            </button>

            {totalRows > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-emerald-700 font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {totalRows} row{totalRows !== 1 ? "s" : ""} added
              </div>
            )}
          </div>
        )}

        {/* File cards */}
        {files.length > 0 && (
          <div className="space-y-3">
            {files.map((f) => (
              <FileCard key={f.id} file={f} onRemove={removeFile} />
            ))}
          </div>
        )}

        {/* Empty state hint */}
        {files.length === 0 && (
          <div className="card-sm bg-slate-50 border-dashed">
            <h3 className="text-sm font-bold text-slate-700 mb-2">What happens after upload?</h3>
            <ol className="space-y-1.5 text-xs text-slate-500">
              <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">1</span> GPT-4o reads every row from your invoice image or PDF</li>
              <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">2</span> Each row is saved: QTY, PARTY NAME, GST NO, TAXABLE VALUE, CGST/SGST/IGST, STATE</li>
              <li className="flex items-start gap-2"><span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">3</span> Excel downloads with separate Amazon &amp; Flipkart sheets + totals</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
