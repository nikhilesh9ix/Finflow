import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/State";
import { useToast } from "../components/Toast";
import { api, type BudgetAlert } from "../services/api";
import { budgetCategories, sampleBudgetAlerts } from "../store/sampleData";
import { formatCurrency } from "../utils/format";
import { cn } from "../utils/cn";

const statusStyles = {
  safe: {
    bar: "bg-emerald-500",
    badge: "success" as const,
    label: "On track",
  },
  warning: {
    bar: "bg-amber-500",
    badge: "warning" as const,
    label: "Near limit",
  },
  overspent: {
    bar: "bg-rose-500",
    badge: "danger" as const,
    label: "Over budget",
  },
};

export function BudgetsPage() {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: "Food", monthly_limit: "5000", priority: "normal" });

  const loadBudgets = useCallback(() => {
    setLoading(true);
    api.getBudgetAlerts()
      .then((rows) => {
        if (rows.length === 0) {
          setAlerts(sampleBudgetAlerts);
          setUsingSampleData(true);
          return;
        } else {
          setAlerts(rows);
          setUsingSampleData(false);
        }
        return undefined;
      })
      .catch((err) => {
        setAlerts(sampleBudgetAlerts);
        setUsingSampleData(true);
        showToast(err instanceof Error ? err.message : "Unable to load budgets", "error");
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const limit = Number(form.monthly_limit);
    if (!form.category || Number.isNaN(limit) || limit <= 0) {
      showToast("Enter a valid category and monthly limit.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.createBudget({
        category: form.category,
        monthly_limit: limit,
        priority: form.priority,
      });
      showToast(`Budget created for ${form.category}.`);
      setModalOpen(false);
      setForm({ category: "Food", monthly_limit: "5000", priority: "normal" });
      loadBudgets();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to create budget", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardHeader eyebrow="Adaptive budget" title="Budget planner" />
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)} type="button">
          Create budget
        </Button>
      </div>

      {usingSampleData && (
        <ErrorState
          message="Showing demo budgets until live backend data is available."
          action={<Button onClick={loadBudgets} type="button" variant="secondary">Retry</Button>}
        />
      )}

      {alerts.length === 0 ? (
        <EmptyState title="No budgets yet" body="Create category budgets to monitor monthly spend." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {alerts.map((budget) => {
            const styles = statusStyles[budget.status];
            const progress = budget.monthly_limit > 0
              ? Math.min((budget.spent / budget.monthly_limit) * 100, 100)
              : 0;
            return (
              <Card key={`${budget.budget_id}-${budget.category}`}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">{budget.category}</h2>
                  <Badge tone={styles.badge}>{styles.label}</Badge>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  {formatCurrency(budget.spent)} of {formatCurrency(budget.monthly_limit)}
                </p>
                <progress className={cn("mt-3 h-2.5 w-full overflow-hidden rounded-full transition-all", styles.bar)} max={100} value={progress} />
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-700 dark:text-slate-200">{Math.round(budget.usage_percent)}% used</span>
                  <span className={budget.remaining < 0 ? "font-bold text-rose-600 dark:text-rose-300" : "text-slate-500"}>
                    {budget.remaining < 0 ? `${formatCurrency(Math.abs(budget.remaining))} over` : `${formatCurrency(budget.remaining)} left`}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal onClose={() => setModalOpen(false)} open={modalOpen} title="Create category budget">
        <form className="space-y-4" onSubmit={handleCreate}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Category</span>
            <select
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              value={form.category}
            >
              {budgetCategories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <Input
            label="Monthly limit (₹)"
            min="1"
            onChange={(event) => setForm((current) => ({ ...current, monthly_limit: event.target.value }))}
            required
            step="100"
            type="number"
            value={form.monthly_limit}
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Priority</span>
            <select
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
              value={form.priority}
            >
              <option value="essential">Essential</option>
              <option value="normal">Normal</option>
              <option value="watch">Watch</option>
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setModalOpen(false)} type="button" variant="secondary">Cancel</Button>
            <Button disabled={submitting} type="submit">{submitting ? "Saving..." : "Save budget"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
