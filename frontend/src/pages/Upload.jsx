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

const STEPS = ["Queued", "Uploading", "Extracting via GPT-4o", "Done"];

function FileStepper({ file }) {
  const stepIdx =
    file.status === "queued"
      ? 0
      : file.status === "uploading"
      ? 1
      : file.status === "extracting"
      ? 2
      : 3;

  return (
    <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]" title={file.name}>
          {file.name}
        </span>
        {file.status === "done" && file.result && (
          <span className={file.result.status === "processed" ? "badge-sale" : "badge-return"}>
            {file.result.status === "processed" ? "Processed" : "Error"}
          </span>
        )}
        {file.status === "error" && (
          <span className="badge-return">Error</span>
        )}
      </div>

      {/* Step track */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const active = i === stepIdx;
          const done = i < stepIdx || file.status === "done";
          const isError = file.status === "error" && i <= stepIdx;
          return (
            <div key={step} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full h-1.5 rounded-full transition-all ${
                  isError
                    ? "bg-red-400"
                    : done || active
                    ? "bg-brand-600"
                    : "bg-gray-200"
                }`}
              />
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-brand-600" : done ? "text-gray-500" : "text-gray-300"
                }`}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Result details */}
      {file.status === "done" && file.result?.status === "processed" && (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
          {file.result.invoice_no && <span>Invoice: <b>{file.result.invoice_no}</b></span>}
          {file.result.customer_name && <span>Customer: <b>{file.result.customer_name}</b></span>}
          {file.result.total_amount != null && (
            <span>Total: <b>₹{Number(file.result.total_amount).toLocaleString("en-IN")}</b></span>
          )}
          {file.result.type && (
            <span>Type: <b>{file.result.type}</b></span>
          )}
        </div>
      )}
      {(file.status === "error" || file.result?.status === "error") && (
        <p className="mt-2 text-xs text-red-500">{file.error || file.result?.error || "Extraction failed"}</p>
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
    onDrop,
    accept: ACCEPTED,
    multiple: true,
  });

  const updateFile = (id, patch) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const processFiles = async () => {
    const queued = files.filter((f) => f.status === "queued");
    if (queued.length === 0) return;
    setUploading(true);

    for (const f of queued) {
      updateFile(f.id, { status: "uploading" });
      await new Promise((r) => setTimeout(r, 300));
      updateFile(f.id, { status: "extracting" });

      try {
        const form = new FormData();
        form.append("files", f.file);
        const { data } = await axios.post("/api/upload", form);
        const result = data.results?.[0];
        updateFile(f.id, { status: "done", result });
      } catch (err) {
        updateFile(f.id, {
          status: "error",
          error: err.response?.data?.detail || "Upload failed",
        });
      }
    }
    setUploading(false);
  };

  const clearAll = () => setFiles([]);
  const queuedCount = files.filter((f) => f.status === "queued").length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload invoice images or PDFs — GPT-4o will extract all fields automatically.
        </p>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-brand-500 bg-brand-50" : "border-gray-300 hover:border-brand-400 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="text-4xl mb-3">📄</div>
        <p className="text-gray-700 font-medium">
          {isDragActive ? "Drop files here…" : "Drag & drop invoices here"}
        </p>
        <p className="text-sm text-gray-400 mt-1">or click to browse — PDF, PNG, JPG, TIFF supported</p>
      </div>

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={processFiles}
            disabled={uploading || queuedCount === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Processing…" : `Process ${queuedCount} file${queuedCount !== 1 ? "s" : ""}`}
          </button>
          <button onClick={clearAll} disabled={uploading} className="btn-secondary">
            Clear All
          </button>
        </div>
      )}

      {/* File list with steppers */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((f) => (
            <FileStepper key={f.id} file={f} />
          ))}
        </div>
      )}
    </div>
  );
}
