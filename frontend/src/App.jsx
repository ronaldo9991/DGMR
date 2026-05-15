import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Upload from "./pages/Upload.jsx";
import Records from "./pages/Records.jsx";

const NAV = [
  {
    to: "/",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
      </svg>
    ),
    label: "Dashboard",
  },
  {
    to: "/upload",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    label: "Upload",
  },
  {
    to: "/records",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    label: "Records",
  },
];

/* ── Desktop sidebar ─────────────────────────────────────────────────── */
function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 flex flex-col z-20 select-none">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">DGMR TECH</div>
            <div className="text-slate-400 text-xs">OCR Dashboard</div>
          </div>
        </div>
      </div>

      {/* Platform indicators */}
      <div className="px-4 py-3 border-b border-slate-700/60">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">Platforms</p>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Amazon
          </span>
          <span className="inline-flex items-center gap-1.5 bg-orange-500/20 text-orange-300 text-xs font-bold px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Flipkart
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? "bg-white text-slate-900"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 block" />
          </div>
          <span className="text-slate-400 text-xs">GPT-4o Vision Active</span>
        </div>
      </div>
    </aside>
  );
}

/* ── Mobile top header ───────────────────────────────────────────────── */
function MobileHeader() {
  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-20 bg-slate-900 flex items-center justify-between px-4 h-14 border-b border-slate-700/60">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <span className="text-white font-bold text-sm">DGMR TECH</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
          <span className="w-1 h-1 rounded-full bg-blue-400" /> Amazon
        </span>
        <span className="inline-flex items-center gap-1 bg-orange-500/20 text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
          <span className="w-1 h-1 rounded-full bg-orange-400" /> Flipkart
        </span>
      </div>
    </header>
  );
}

/* ── Mobile bottom nav ───────────────────────────────────────────────── */
function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-slate-900 border-t border-slate-700/60 flex safe-area-bottom">
      {NAV.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              isActive ? "text-white" : "text-slate-500"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-white/10" : ""}`}>
                {icon}
              </span>
              <span className="text-[10px] font-semibold">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile top bar + bottom nav */}
      <MobileHeader />
      <BottomNav />

      {/* Main content */}
      <main className="
        min-h-screen
        md:ml-60
        pt-14 md:pt-0
        pb-20 md:pb-0
      ">
        <Routes>
          <Route path="/"        element={<Dashboard />} />
          <Route path="/upload"  element={<Upload />} />
          <Route path="/records" element={<Records />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
