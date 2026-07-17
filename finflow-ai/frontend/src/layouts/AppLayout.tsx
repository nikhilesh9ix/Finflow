import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  BriefcaseBusiness,
  CreditCard,
  LayoutDashboard,
  Menu,
  Moon,
  PiggyBank,
  ReceiptText,
  Settings,
  Sun,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "../components/Button";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../store/auth";
import { cn } from "../utils/cn";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: ReceiptText },
  { label: "Budgets", href: "/budgets", icon: Target },
  { label: "Salary Planner", href: "/salary-planner", icon: BriefcaseBusiness },
  { label: "Debt Manager", href: "/debt-manager", icon: CreditCard },
  { label: "Investments", href: "/investments", icon: PiggyBank },
  { label: "AI Copilot", href: "/ai-copilot", icon: Bot },
  { label: "Settings", href: "/settings", icon: Settings },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex h-full flex-col bg-white dark:bg-slate-950">
      <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-600 text-lg font-black text-white shadow-soft">F</div>
        <div>
          <p className="text-lg font-black text-slate-950 dark:text-white">FinFlow AI</p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Personal AI CFO</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-500",
                isActive
                  ? "bg-teal-50 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900",
              )
            }
            end={item.href === "/"}
            key={item.href}
            onClick={onNavigate}
            to={item.href}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-900">
          <WalletCards className="h-5 w-5 text-teal-600 dark:text-teal-300" />
          <p className="mt-3 text-sm font-bold text-slate-950 dark:text-white">June cash flow</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Savings rate is up 2.4% from last month.</p>
        </div>
      </div>
    </aside>
  );
}

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = navItems.find((item) => item.href === location.pathname)?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 dark:border-slate-800 lg:block">
        <Sidebar />
      </div>
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/50" onClick={() => setDrawerOpen(false)} type="button" aria-label="Close navigation drawer" />
          <div className="relative h-full w-80 max-w-[85vw] border-r border-slate-200 dark:border-slate-800">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
            <Button className="absolute right-3 top-3 h-9 w-9 p-0" onClick={() => setDrawerOpen(false)} type="button" variant="ghost" aria-label="Close menu">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
          <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button className="h-10 w-10 p-0 lg:hidden" onClick={() => setDrawerOpen(true)} type="button" variant="secondary" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">Workspace</p>
                <h1 className="truncate text-xl font-black text-slate-950 dark:text-white">{activePage}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button className="hidden sm:inline-flex" type="button" variant="secondary">
                Export
              </Button>
              <div className="hidden text-right lg:block">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">Signed in</p>
                <p className="max-w-48 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.full_name ?? user?.email ?? "FinFlow user"}</p>
              </div>
              <Button
                className="hidden sm:inline-flex"
                onClick={() => {
                  signOut();
                  navigate("/login", { replace: true });
                }}
                type="button"
                variant="secondary"
              >
                Sign out
              </Button>
              <Button className="h-10 w-10 p-0" onClick={toggleTheme} type="button" variant="secondary" aria-label="Toggle color theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
