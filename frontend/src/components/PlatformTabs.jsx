const PLATFORM_ICONS = {
  All: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  Amazon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14.496 11.677c0 .988-.025 1.809-.076 2.463-.05.654-.188 1.24-.41 1.76-.222.52-.567.91-1.035 1.168-.468.259-1.065.388-1.79.388-.729 0-1.326-.13-1.792-.388-.466-.258-.81-.648-1.032-1.168-.222-.52-.36-1.106-.41-1.76-.05-.654-.075-1.475-.075-2.463 0-.982.025-1.8.075-2.454.05-.654.188-1.243.41-1.766.222-.524.566-.916 1.032-1.177.466-.261 1.063-.392 1.792-.392.725 0 1.322.131 1.79.392.468.261.813.653 1.035 1.177.222.523.36 1.112.41 1.766.051.654.076 1.472.076 2.454z"/>
    </svg>
  ),
  Flipkart: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
    </svg>
  ),
};

const PLATFORM_STYLES = {
  All: { active: "bg-slate-900 text-white", dot: "bg-slate-400" },
  Amazon: { active: "bg-blue-600 text-white", dot: "bg-blue-400" },
  Flipkart: { active: "bg-orange-500 text-white", dot: "bg-orange-400" },
};

export default function PlatformTabs({ active, onChange, counts = {} }) {
  const tabs = ["All", "Amazon", "Flipkart"];

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => {
        const isActive = active === tab;
        const styles = PLATFORM_STYLES[tab] || PLATFORM_STYLES.All;
        const count = counts[tab];
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? styles.active + " shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {PLATFORM_ICONS[tab]}
            {tab}
            {count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
