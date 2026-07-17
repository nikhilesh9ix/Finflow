import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { useToast } from "../components/ToastProvider";
import { apiFetch } from "../lib/api";
import { demoBudgets, fallbackNotice } from "../lib/demoData";
import { formatCurrency } from "../lib/format";
import type { Budget } from "../types";
import { UtensilsCrossed, Home, PiggyBank, CreditCard, HelpCircle } from "lucide-react";

function getBudgetIcon(category: string) {
  const clean = category.toLowerCase().trim();
  if (clean.includes("food") || clean.includes("dining")) return UtensilsCrossed;
  if (clean.includes("rent") || clean.includes("housing") || clean.includes("bills") || clean.includes("utilities")) return Home;
  if (clean.includes("invest") || clean.includes("savings")) return PiggyBank;
  if (clean.includes("emi") || clean.includes("debt") || clean.includes("loan") || clean.includes("card")) return CreditCard;
  return HelpCircle;
}

function getBudgetColor(category: string) {
  const clean = category.toLowerCase().trim();
  if (clean.includes("food") || clean.includes("dining")) return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30";
  if (clean.includes("rent") || clean.includes("housing") || clean.includes("bills") || clean.includes("utilities")) return "text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/30";
  if (clean.includes("invest") || clean.includes("savings")) return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30";
  if (clean.includes("emi") || clean.includes("debt") || clean.includes("loan") || clean.includes("card")) return "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30";
  return "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-950/30";
}

export function BudgetsPage() {
  const { showToast } = useToast();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<Budget[]>("/budgets");
        if (active) setBudgets(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load budgets";
        if (active) {
          setError(message);
          setBudgets(demoBudgets);
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

  if (loading && !budgets.length) return <LoadingSkeleton variant="cards" />;

  return (
    <div className="space-y-6 lg:space-y-8">
      {error ? <ErrorState title="Live budgets unavailable" body={error} /> : null}
      <section className="hero-panel">
        <p className="section-kicker">Adaptive planning</p>
        <h2 className="section-title">Budget planner</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-650 sm:text-base dark:text-slate-350 font-medium">A calm view of spending guardrails so you can manage priorities without feeling boxed in.</p>
      </section>
      {budgets.length === 0 ? <EmptyState title="No budgets set" body="Create your categories and limits to track goal progress with clear, modern guardrails." /> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {budgets.map((budget) => {
          const progress = Math.min((budget.spent / budget.monthly_limit) * 100, 120);
          const isOver = budget.spent > budget.monthly_limit;
          const diff = Math.abs(budget.monthly_limit - budget.spent);
          const IconComponent = getBudgetIcon(budget.category);
          const colorClass = getBudgetColor(budget.category);
          
          return (
            <div className="panel" key={budget.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${colorClass}`}>
                    <IconComponent className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="panel-title text-base font-bold">{budget.category}</h3>
                    <p className="text-xs font-semibold text-slate-400 capitalize">{budget.priority} priority</p>
                  </div>
                </div>
                <span className={isOver ? "badge-danger" : "badge-success"}>{isOver ? "Over" : "On track"}</span>
              </div>
              
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded-full transition-all duration-300 ${isOver ? "bg-rose-500" : "bg-linear-to-r from-teal-500 to-cyan-500"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              
              <div className="flex justify-between mt-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                <span>{formatCurrency(budget.spent)} of {formatCurrency(budget.monthly_limit)}</span>
                <span className={isOver ? "text-rose-600 dark:text-rose-450" : "text-emerald-600 dark:text-emerald-450"}>
                  {isOver ? `${formatCurrency(diff)} over` : `${formatCurrency(diff)} left`}
                </span>
              </div>
            </div>
          );
        })}
      </div>}
    </div>
  );
}
