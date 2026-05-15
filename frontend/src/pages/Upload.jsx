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

const STEPS = ["Queued", "Uploading", "GPT-4o Extracting", "Done"];

const PLATFORM_COLOR = {
  Flipkart: "bg-orange-500",
  Amazon: "bg-blue-600",
  Other: "bg-purple-500",
};

function FileStepper({ file }) {
  const stepIdx =
    file.status === "queued" ? 0
    : file.status === "uploading" ? 1
    : file.status === "extracting" ? 2
    : 3;

  return (
    <div className="border border-gray-100 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]" title={file.name}>
          {file.name}
        </span>
        <div className="flex items-center gap-2">
          {file.result?.platform && (
            <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${PLATFORM_COLOR[file.result.platform] || "bg-gray-400"}`}>
              {file.result.platform}
            </span>
          )}
          {file.status === "done" && (
            <span className={file.result?.status === "processed" ? "badge-sale" : "badge-return"}>
              {file.result?.status === "processed"
                ? `${file.result.rows_added} row${file.result.rows_added !== 1 ? "s" : ""} added`
                : "Error"}
            </span>
          )}
          {file.status === "error" && <span className="badge-return">Error</span>}
        </div>
      </div>

      {/* Step progress track */}
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const active = i === stepIdx;
          const done = i < stepIdx || (file.status === "done" && i <= stepIdx);
          const isError = file.status === "error" && i <= stepIdx;
          return (
            <div key={step} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full h-1.5 rounded-full transition-all ${
                isError ? "bg-red-400" : done || active ? "bg-brand-600" : "bg-gray-200"
              }`} />
              <span className={`text-[10px] font-medium ${
                active ? "text-brand-600" : done ? "text-gray-500" : "text-gray-300"
              }`}>{step}</span>
            </div>
          );
        })}
      </div>

      {file.status === "error" && (
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: ACCEPTED, multiple: true });
  const updateFile = (id, patch) => setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

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
          error: err.response?.data?.detail || "Upload failed — check OPENAI_API_KEY",
        });
      }
    }
    setUploading(false);
  };

  const clearDone = () => setFiles((prev) => prev.filter((f) => f.status === "queued"));
  const clearAll = () => setFiles([]);
  const queuedCount = files.filter((f) => f.status === "queued").length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const totalRowsAdded = files.reduce((s, f) => s + (f.result?.rows_added || 0), 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Invoices</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload Amazon or Flipkart invoice images/PDFs — GPT-4o extracts all rows automatically.
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
          {isDragActive ? "Drop files here…" : "Drag & drop Amazon / Flipkart invoices"}
        </p>
        <p className="text-sm text-gray-400 mt-1">PDF, PNG, JPG supported · Multiple files at once</p>
      </div>

      {files.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={processFiles}
            disabled={uploading || queuedCount === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Processing…" : `Process ${queuedCount} file${queuedCount !== 1 ? "s" : ""}`}
          </button>
          {doneCount > 0 && (
            <button onClick={clearDone} disabled={uploading} className="btn-secondary">
              Clear Completed
            </button>
          )}
          <button onClick={clearAll} disabled={uploading} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
            Clear All
          </button>
          {totalRowsAdded > 0 && (
            <span className="text-sm text-emerald-600 font-medium">
              {totalRowsAdded} invoice row{totalRowsAdded !== 1 ? "s" : ""} added to database
            </span>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((f) => <FileStepper key={f.id} file={f} />)}
        </div>
      )}
    </div>
  );
}
