import { CreditCard, HelpCircle, Home, PiggyBank, UtensilsCrossed } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { formatCurrency } from "../lib/format";
import { useBudgetAlerts, useBudgets } from "../lib/queries";
import type { BudgetAlert } from "../types";

function getBudgetIcon(category: string) {
  const c = category.toLowerCase();
  if (c.includes("food") || c.includes("dining")) return UtensilsCrossed;
  if (c.includes("rent") || c.includes("housing") || c.includes("utilities")) return Home;
  if (c.includes("invest") || c.includes("savings")) return PiggyBank;
  if (c.includes("emi") || c.includes("debt") || c.includes("loan")) return CreditCard;
  return HelpCircle;
}

function getBudgetColor(category: string) {
  const c = category.toLowerCase();
  if (c.includes("food") || c.includes("dining"))
    return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30";
  if (c.includes("rent") || c.includes("housing") || c.includes("utilities"))
    return "text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/30";
  if (c.includes("invest") || c.includes("savings"))
    return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30";
  if (c.includes("emi") || c.includes("debt") || c.includes("loan"))
    return "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30";
  return "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-950/30";
}

function BudgetCard({ alert }: { alert: BudgetAlert }) {
  const progress = Math.min((alert.spent / alert.monthly_limit) * 100, 100);
  const isOver = alert.status === "overspent" || alert.status === "over";
  const diff = Math.abs(alert.monthly_limit - alert.spent);
  const Icon = getBudgetIcon(alert.category);
  const colorClass = getBudgetColor(alert.category);

  return (
    <div className="panel">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2.5 ${colorClass}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="panel-title text-base font-bold">{alert.category}</h3>
            <p className="text-xs font-semibold text-slate-400 tabular-nums">
              {alert.usage_percent}% used
            </p>
          </div>
        </div>
        <span className={isOver ? "badge-danger" : alert.status === "warning" ? "badge-warning" : "badge-success"}>
          {isOver ? "Over" : alert.status === "warning" ? "Warning" : "On track"}
        </span>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isOver
              ? "bg-rose-500"
              : alert.status === "warning"
              ? "bg-amber-500"
              : "bg-linear-to-r from-teal-500 to-cyan-500"
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      <div className="mt-3 flex justify-between text-sm text-slate-600 dark:text-slate-300 font-medium">
        <span>
          {formatCurrency(alert.spent)} of {formatCurrency(alert.monthly_limit)}
        </span>
        <span className={isOver ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
          {isOver ? `${formatCurrency(diff)} over` : `${formatCurrency(diff)} left`}
        </span>
      </div>
    </div>
  );
}

export function BudgetsPage() {
  const { data: budgetsPage, isLoading: budgetsLoading, isError: budgetsError } = useBudgets();
  const { data: alerts, isLoading: alertsLoading, isError: alertsError } = useBudgetAlerts();

  const isLoading = budgetsLoading || alertsLoading;
  const isError = budgetsError || alertsError;

  if (isLoading && !alerts) return <LoadingSkeleton variant="cards" />;

  const displayAlerts = alerts ?? [];
  const hasBudgets = (budgetsPage?.total ?? 0) > 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      {isError && (
        <ErrorState title="Live budgets unavailable" body="Could not reach the backend. Check your connection." />
      )}

      <section className="hero-panel">
        <p className="section-kicker">Adaptive planning</p>
        <h2 className="section-title">Budget planner</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-350 font-medium">
          Clear guardrails on every spending category. Track actual spend vs limit in real time.
        </p>
      </section>

      {!hasBudgets ? (
        <EmptyState
          title="No budgets set"
          body="Create budget categories and limits via the API or import a bank statement first."
        />
      ) : displayAlerts.length === 0 ? (
        <EmptyState
          title="No data this month"
          body="Upload transactions to see budget health."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {displayAlerts.map((alert) => (
            <BudgetCard key={alert.budget_id} alert={alert} />
          ))}
        </div>
      )}

      {displayAlerts.length > 0 && (
        <section className="panel">
          <h3 className="panel-title">Month overview</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="text-right">Limit</th>
                  <th className="text-right">Spent</th>
                  <th className="text-right">Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {displayAlerts.map((alert) => {
                  const isOver = alert.status === "overspent" || alert.status === "over";
                  return (
                    <tr key={alert.budget_id}>
                      <td className="font-semibold">{alert.category}</td>
                      <td className="text-right tabular-nums">{formatCurrency(alert.monthly_limit)}</td>
                      <td className="text-right tabular-nums">{formatCurrency(alert.spent)}</td>
                      <td className={`text-right tabular-nums font-semibold ${isOver ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {isOver ? `-${formatCurrency(Math.abs(alert.remaining))}` : formatCurrency(alert.remaining)}
                      </td>
                      <td>
                        <span className={isOver ? "badge-danger" : alert.status === "warning" ? "badge-warning" : "badge-success"}>
                          {alert.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
