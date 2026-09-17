import { CreditCard, HelpCircle, Home, PiggyBank, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { isAuthError, isBackendUnreachable } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { useBudgetAlerts, useBudgets, useCreateBudget, useDeleteBudget } from "../lib/queries";
import type { BudgetAlert } from "../types";

// Categories the CSV importer assigns, so budgets line up with real spend rows.
const CATEGORIES = [
  "Food",
  "Bills",
  "Transport",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Education",
  "EMI/Loan",
  "Other",
];

function BudgetForm({ onDone }: { onDone: () => void }) {
  const createBudget = useCreateBudget();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [limit, setLimit] = useState("");
  const [priority, setPriority] = useState("normal");
  const [error, setError] = useState("");

  return (
    <form
      className="panel space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const amount = Number(limit);
        if (!Number.isFinite(amount) || amount <= 0) {
          setError("Enter a monthly limit greater than zero.");
          return;
        }
        try {
          await createBudget.mutateAsync({ category, monthly_limit: amount, priority });
          setLimit("");
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save budget");
        }
      }}
    >
      <h3 className="panel-title">New budget</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="form-label" htmlFor="budget-category">Category</label>
          <select
            className="input mt-2"
            id="budget-category"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="budget-limit">Monthly limit (₹)</label>
          {/*
            step stays 1: the browser measures steps from `min`, so a coarser
            step makes ordinary amounts like 10000 fail constraint validation
            and the submit is blocked with no visible error.
          */}
          <input
            className="input mt-2"
            id="budget-limit"
            min="1"
            onChange={(event) => setLimit(event.target.value)}
            placeholder="10000"
            step="1"
            type="number"
            value={limit}
          />
        </div>
        <div>
          <label className="form-label" htmlFor="budget-priority">Priority</label>
          <select
            className="input mt-2"
            id="budget-priority"
            onChange={(event) => setPriority(event.target.value)}
            value={priority}
          >
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={createBudget.isPending} type="submit">
        {createBudget.isPending ? "Saving…" : "Save budget"}
      </button>
    </form>
  );
}

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
    return "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30";
  if (c.includes("emi") || c.includes("debt") || c.includes("loan"))
    return "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/30";
  return "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-950/30";
}

function BudgetCard({ alert, onDelete }: { alert: BudgetAlert; onDelete: () => void }) {
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
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              {alert.usage_percent}% used
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={isOver ? "badge-danger" : alert.status === "warning" ? "badge-warning" : "badge-success"}>
            {isOver ? "Over" : alert.status === "warning" ? "Warning" : "On track"}
          </span>
          <button
            aria-label={`Delete ${alert.category} budget`}
            className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
            onClick={onDelete}
            type="button"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
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
        <span className={isOver ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}>
          {isOver ? `${formatCurrency(diff)} over` : `${formatCurrency(diff)} left`}
        </span>
      </div>
    </div>
  );
}

export function BudgetsPage() {
  const { data: budgetsPage, isLoading: budgetsLoading, isError: budgetsError, error: budgetsErr } = useBudgets();
  const { data: alerts, isLoading: alertsLoading, isError: alertsError, error: alertsErr } = useBudgetAlerts();

  const deleteBudget = useDeleteBudget();
  const [showForm, setShowForm] = useState(false);

  const isLoading = budgetsLoading || alertsLoading;
  const isError = budgetsError || alertsError;
  const error = budgetsErr ?? alertsErr;

  if (isLoading && !alerts) return <LoadingSkeleton variant="cards" />;

  const displayAlerts = alerts ?? [];
  const hasBudgets = (budgetsPage?.total ?? 0) > 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      {isError && !isAuthError(error) && (
        <ErrorState
          title={isBackendUnreachable(error) ? "Live budgets unavailable" : "Could not load budgets"}
          body={
            isBackendUnreachable(error)
              ? "Could not reach the backend. Check your connection."
              : error instanceof Error
                ? error.message
                : "API error"
          }
        />
      )}

      <section className="hero-panel flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker">Adaptive planning</p>
          <h2 className="section-title">Budget planner</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300 font-medium">
            Clear guardrails on every spending category. Track actual spend vs limit in real time.
          </p>
        </div>
        <button className="primary-button shrink-0" onClick={() => setShowForm((v) => !v)} type="button">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {showForm ? "Cancel" : "Add budget"}
        </button>
      </section>

      {showForm && <BudgetForm onDone={() => setShowForm(false)} />}

      {!hasBudgets ? (
        <EmptyState
          title="No budgets yet"
          body="Set a monthly limit per category to track spending pressure. Start with your biggest recurring costs — rent, food, transport."
          action={
            <button className="primary-button" onClick={() => setShowForm(true)} type="button">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create your first budget
            </button>
          }
        />
      ) : displayAlerts.length === 0 ? null /* every budget has an alert; empty only when the request failed, shown above */ : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {displayAlerts.map((alert) => (
            <BudgetCard alert={alert} key={alert.budget_id} onDelete={() => {
              if (window.confirm(`Delete the ${alert.category} budget? This cannot be undone.`)) {
                deleteBudget.mutate(alert.budget_id);
              }
            }} />
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
                      <td className={`text-right tabular-nums font-semibold ${isOver ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
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
