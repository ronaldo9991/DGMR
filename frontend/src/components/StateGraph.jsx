const PLATFORM_COLOR = { Flipkart: "bg-orange-500", Amazon: "bg-blue-600", Other: "bg-purple-500" };

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
          <div className="flex flex-col items-center pt-1">
            <span
              className={`w-3 h-3 rounded-full flex-shrink-0 ${
                item.status === "processed"
                  ? (PLATFORM_COLOR[item.platform] || "bg-green-500")
                  : "bg-red-500"
              }`}
            />
            {idx < recent.length - 1 && (
              <span className="w-px flex-1 bg-gray-200 mt-1 min-h-[1.5rem]" />
            )}
          </div>

          <div className="flex-1 pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-800 truncate max-w-[220px]" title={item.filename}>
                {item.party_name || item.filename || "—"}
              </span>
              <div className="flex items-center gap-2">
                {item.platform && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${
                    PLATFORM_COLOR[item.platform] || "bg-gray-400"
                  }`}>
                    {item.platform}
                  </span>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  item.status === "processed"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {item.status === "processed" ? "Processed" : "Error"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {item.inv_no && (
                <span className="text-xs text-gray-500">INV #{item.inv_no}</span>
              )}
              {item.taxable_value != null && (
                <span className="text-xs text-gray-500">
                  ₹{Number(item.taxable_value).toLocaleString("en-IN")} taxable
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
