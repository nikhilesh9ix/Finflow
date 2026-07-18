import { BarChart3, Bot, BriefcaseBusiness, CreditCard, LayoutDashboard, LogOut, Moon, PiggyBank, Settings, Sun, Upload } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { useThemeStore } from "../store/theme";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: Upload },
  { to: "/budgets", label: "Budgets", icon: BarChart3 },
  { to: "/salary", label: "Salary Flow", icon: BriefcaseBusiness },
  { to: "/debts", label: "Debts", icon: CreditCard },
  { to: "/investments", label: "Investments", icon: PiggyBank },
  { to: "/copilot", label: "Copilot", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.10),transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,rgba(13,148,136,0.15),transparent_28%),radial-gradient(circle_at_top_right,rgba(37,99,235,0.12),transparent_22%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] dark:text-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200/70 bg-white/80 p-4 backdrop-blur-xl xl:block dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white/50 px-4 py-3.5 shadow-xs transition hover:border-slate-350 dark:border-slate-800/80 dark:bg-slate-900/40">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-linear-to-tr from-teal-500 via-teal-600 to-cyan-600 text-lg font-extrabold text-white shadow-md shadow-teal-600/20">F</div>
          <div>
            <p className="text-base font-bold tracking-tight">FinFlow AI</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Personal AI CFO</p>
          </div>
        </div>
        <nav className="space-y-1" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : "nav-link-idle"}`}>
              <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/60 px-6 py-4 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/60">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Welcome back</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-905 dark:text-white mt-0.5">{user?.full_name ?? "Demo user"}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="icon-button" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} type="button">
                {theme === "dark" ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-slate-650" />}
              </button>
              <button className="icon-button hover:text-rose-600 dark:hover:text-rose-400" onClick={logout} aria-label="Log out" type="button">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:hidden" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `inline-flex min-w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${isActive ? "bg-linear-to-r from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-650/20" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800"}`}>
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
