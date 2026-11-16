import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: "◧" },
  { to: "/transactions", label: "Transactions", icon: "☰" },
  { to: "/budgets", label: "Budgets", icon: "◔" },
  { to: "/net-worth", label: "Net Worth", icon: "↗" },
];

/** Sidebar on desktop, bottom tab bar on phones. */
export function Layout() {
  const { session, signOut } = useAuth();

  return (
    <div className="min-h-full md:flex">
      <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:fixed md:inset-y-0 bg-slate-900 border-r border-slate-800 p-4">
        <div className="text-emerald-400 text-2xl font-bold px-3 mb-6">Savely</div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`
              }
            >
              <span className="w-5 text-center text-lg leading-none">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-3">
          <div className="text-slate-400 text-sm truncate" title={session?.user.email ?? ""}>
            {session?.user.email}
          </div>
          <button onClick={signOut} className="text-slate-500 hover:text-slate-200 text-sm mt-1">
            Sign out
          </button>
        </div>
      </aside>

      <header className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="text-emerald-400 text-xl font-bold">Savely</div>
        <button onClick={signOut} className="text-slate-400 text-sm">
          Sign out
        </button>
      </header>

      <main className="flex-1 min-w-0 md:ml-60 pb-24 md:pb-0">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 flex bg-slate-900 border-t border-slate-800">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? "text-emerald-400" : "text-slate-500"
              }`
            }
          >
            <span className="text-lg leading-none">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
