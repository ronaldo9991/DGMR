const STATUS_COLOR = {
  processed: "bg-green-500",
  error: "bg-red-500",
  pending: "bg-yellow-400",
};

const STATUS_LABEL = {
  processed: "Processed",
  error: "Error",
  pending: "Pending",
};

export default function StateGraph({ recent }) {
  if (!recent || recent.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-6 text-center">
        No uploads yet — upload your first invoice to see activity here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recent.map((item, idx) => (
        <div key={item.id || idx} className="flex items-start gap-3">
          {/* Timeline dot + line */}
          <div className="flex flex-col items-center pt-1">
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_COLOR[item.status] || "bg-gray-400"}`} />
            {idx < recent.length - 1 && <span className="w-px flex-1 bg-gray-200 mt-1 min-h-[1.5rem]" />}
          </div>

          <div className="flex-1 pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-800 truncate max-w-[180px]" title={item.filename}>
                {item.filename || "—"}
              </span>
              <div className="flex items-center gap-2">
                {item.type && (
                  <span className={item.type === "Return" ? "badge-return" : "badge-sale"}>
                    {item.type}
                  </span>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  item.status === "processed"
                    ? "bg-green-100 text-green-700"
                    : item.status === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}>
                  {STATUS_LABEL[item.status] || item.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {item.total_amount != null && (
                <span className="text-xs text-gray-500">
                  ₹{Number(item.total_amount).toLocaleString("en-IN")}
                </span>
              )}
              {item.created_at && (
                <span className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
