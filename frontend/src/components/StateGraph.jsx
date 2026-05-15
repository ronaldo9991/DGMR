const PLATFORM_COLOR = {
  Flipkart: "bg-orange-500 text-white",
  Amazon: "bg-blue-600 text-white",
  Other: "bg-purple-500 text-white",
};

export default function StateGraph({ recent }) {
  if (!recent || recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
        <svg className="w-10 h-10 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium">No activity yet</p>
        <p className="text-xs mt-1">Upload invoices to see processing history</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {recent.map((item, idx) => (
        <div key={item.id || idx} className="flex items-start gap-3 py-2">
          {/* Timeline */}
          <div className="flex flex-col items-center pt-1 flex-shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${item.status === "error" ? "bg-red-400" : "bg-emerald-400"}`} />
            {idx < recent.length - 1 && <span className="w-px flex-1 bg-slate-200 my-1 h-6" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">
                {item.party_name || item.filename || "—"}
              </span>
              {item.platform && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PLATFORM_COLOR[item.platform] || "bg-slate-400 text-white"}`}>
                  {item.platform}
                </span>
              )}
              {item.status === "error" && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Error</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
              {item.inv_no && <span>INV #{item.inv_no}</span>}
              {item.taxable_value != null && (
                <span className="font-medium text-slate-600">
                  ₹{Number(item.taxable_value).toLocaleString("en-IN")}
                </span>
              )}
              {item.created_at && (
                <span>{new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
