import { AlertTriangle, PiggyBank, TrendingDown, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { useToast } from "../components/ToastProvider";
import { apiFetch } from "../lib/api";
import { demoDashboardSummary, fallbackNotice } from "../lib/demoData";
import { formatCurrency, formatPercent } from "../lib/format";
import type { DashboardSummary } from "../types";

export function DashboardPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<DashboardSummary>("/dashboard/summary");
        if (active) {
          setData(result);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load dashboard";
        if (active) {
          setError(message);
          setData(demoDashboardSummary);
          showToast(fallbackNotice, "info");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [showToast]);

  if (loading && !data) return <LoadingSkeleton />;

  const summary = data ?? demoDashboardSummary;
  const cards = [
    { label: "Monthly income", value: formatCurrency(summary.monthly_income), icon: Wallet, colorClass: "text-emerald-600 bg-emerald-50/80 dark:text-emerald-400 dark:bg-emerald-950/30" },
    { label: "Spend this month", value: formatCurrency(summary.monthly_spend), icon: TrendingDown, colorClass: "text-rose-600 bg-rose-50/80 dark:text-rose-450 dark:bg-rose-950/30" },
    { label: "Projected savings", value: formatCurrency(summary.projected_savings), icon: PiggyBank, colorClass: "text-cyan-600 bg-cyan-50/80 dark:text-cyan-400 dark:bg-cyan-950/30" },
    { label: "Savings rate", value: formatPercent(summary.savings_rate), icon: AlertTriangle, colorClass: "text-violet-600 bg-violet-50/80 dark:text-violet-400 dark:bg-violet-950/30" },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {error ? <ErrorState title="Live data unavailable" body={error} /> : null}
      <section className="hero-panel">
        <p className="section-kicker">Command center</p>
        <h2 className="section-title">Financial cockpit</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-650 sm:text-base dark:text-slate-350 font-medium">A calm, high-signal view of your cash flow, spending pressure, and opportunities to improve your runway.</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div className="stat-card flex flex-col justify-between" key={card.label}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold tracking-tight text-slate-450 dark:text-slate-500">{card.label}</span>
              <div className={`rounded-xl p-2.5 ${card.colorClass}`}>
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="panel-title">Category spend</h3>
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">A consistent view of where your month is going.</p>
            </div>
          </div>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.category_spend.length ? summary.category_spend : [{ category: "No data", amount: 0 }]}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.95}/>
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.5}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.12} />
                <XAxis dataKey="category" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }} />
                <YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k`} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} cursor={{ fill: "rgba(13,148,136,0.03)" }} />
                <Bar dataKey="amount" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <h3 className="panel-title">Budget health</h3>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Spot pressure points before they become surprises.</p>
          <div className="mt-5 space-y-4">
            {summary.budget_health.map((item) => {
              const progress = Math.min((item.spent / item.limit) * 100, 100);
              return (
                <div key={item.category} className="rounded-2xl border border-slate-200/50 bg-slate-50/50 p-4.5 transition hover:border-slate-350 dark:border-slate-800/60 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{item.category}</p>
                    <span className={item.status === "over" ? "badge-danger" : "badge-success"}>{item.status}</span>
                  </div>
                  <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                    <div className={`h-full rounded-full transition-all duration-300 ${item.status === "over" ? "bg-rose-500" : "bg-linear-to-r from-teal-500 to-cyan-500"}`} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between mt-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>{formatCurrency(item.spent)} of {formatCurrency(item.limit)}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
