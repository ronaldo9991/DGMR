import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Upload from "./pages/Upload.jsx";
import Records from "./pages/Records.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/upload", label: "Upload", icon: "📤" },
  { to: "/records", label: "Records", icon: "📋" },
];

function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-brand-900 flex flex-col z-20">
      <div className="px-5 py-6 border-b border-brand-700">
        <div className="text-white font-bold text-lg leading-tight">DGMR TECH</div>
        <div className="text-brand-100 text-xs mt-0.5">Railway OCR Dashboard</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-brand-100 hover:bg-brand-700 hover:text-white"
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-brand-700 text-brand-300 text-xs">
        Powered by GPT-4o Vision
      </div>
    </aside>
  );
}

function Layout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-56 p-8">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/records" element={<Records />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
