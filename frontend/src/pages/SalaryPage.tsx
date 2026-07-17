import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { useToast } from "../components/ToastProvider";
import { apiFetch } from "../lib/api";
import { demoSalaryPlan, fallbackNotice } from "../lib/demoData";
import { formatCurrency, formatPercent } from "../lib/format";
import { useAuthStore } from "../store/auth";
import type { SalaryPlan } from "../types";

const colors = ["#0f766e", "#1d4ed8", "#7c3aed", "#d97706", "#475569"];

const presetSets = {
  safe: { monthly_income: 90000, monthly_fixed_costs: 48000, debt_load: 26000, savings_goal_months: 8, risk_tolerance: "safe", strategy_mode: "safe" },
  balanced: { monthly_income: 125000, monthly_fixed_costs: 54000, debt_load: 29000, savings_goal_months: 6, risk_tolerance: "balanced", strategy_mode: "balanced" },
  growth: { monthly_income: 180000, monthly_fixed_costs: 65000, debt_load: 18000, savings_goal_months: 12, risk_tolerance: "growth", strategy_mode: "growth" },
};

const initialDraft = presetSets.balanced;

export function SalaryPage() {
  const { showToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const [draft, setDraft] = useState(initialDraft);
  const [plan, setPlan] = useState<SalaryPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const defaults = {
      ...draft,
      monthly_income: user.monthly_income || draft.monthly_income,
    };
    setDraft(defaults);
    void loadPlan(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadPlan(payload: typeof draft) {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<SalaryPlan>("/salary-orchestrator", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setPlan(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to calculate salary plan";
      setError(message);
      setPlan(demoSalaryPlan);
      showToast(fallbackNotice, "info");
    } finally {
      setLoading(false);
    }
  }

  const applyPreset = (mode: keyof typeof presetSets) => {
    const next = presetSets[mode];
    setDraft(next);
    void loadPlan(next);
  };

  if (!plan && loading) return <LoadingSkeleton variant="cards" />;

  return (
    <div className="space-y-6">
      {error ? <ErrorState title="Salary plan fallback active" body={error} /> : null}
      <section className="hero-panel">
        <p className="section-kicker">Salary day automation</p>
        <h2 className="section-title">Salary orchestrator</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Split salary into bills, debt, savings, investments, and lifestyle money using a deterministic rule set that is easy to audit.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(presetSets).map(([key, preset]) => (
          <button className="panel text-left transition hover:-translate-y-0.5 hover:border-teal-400" key={key} onClick={() => applyPreset(key as keyof typeof presetSets)} type="button">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Demo example</p>
            <h3 className="mt-1 text-lg font-semibold capitalize">{key}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Income {formatCurrency(preset.monthly_income)} | Debt load {formatCurrency(preset.debt_load)}</p>
          </button>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="panel space-y-5">
          <div>
            <h3 className="panel-title">Planner inputs</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tune the numbers and recalculate immediately.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="form-label">Monthly salary</span>
              <input className="input" type="number" value={draft.monthly_income} onChange={(event) => setDraft({ ...draft, monthly_income: Number(event.target.value) })} />
            </label>
            <label className="space-y-2">
              <span className="form-label">Monthly fixed costs</span>
              <input className="input" type="number" value={draft.monthly_fixed_costs} onChange={(event) => setDraft({ ...draft, monthly_fixed_costs: Number(event.target.value) })} />
            </label>
            <label className="space-y-2">
              <span className="form-label">Debt load / EMI burden</span>
              <input className="input" type="number" value={draft.debt_load} onChange={(event) => setDraft({ ...draft, debt_load: Number(event.target.value) })} />
            </label>
            <label className="space-y-2">
              <span className="form-label">Emergency goal months</span>
              <input className="input" type="number" min={1} max={24} value={draft.savings_goal_months} onChange={(event) => setDraft({ ...draft, savings_goal_months: Number(event.target.value) })} />
            </label>
            <label className="space-y-2">
              <span className="form-label">Risk tolerance</span>
              <select className="input" value={draft.risk_tolerance} onChange={(event) => setDraft({ ...draft, risk_tolerance: event.target.value })}>
                <option value="safe">Safe</option>
                <option value="balanced">Balanced</option>
                <option value="growth">Growth</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="form-label">Strategy mode</span>
              <select className="input" value={draft.strategy_mode} onChange={(event) => setDraft({ ...draft, strategy_mode: event.target.value })}>
                <option value="safe">Safe</option>
                <option value="balanced">Balanced</option>
                <option value="growth">Growth</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="primary-button" disabled={loading} onClick={() => void loadPlan(draft)} type="button">
              {loading ? "Calculating..." : "Build salary split"}
            </button>
            <button className="secondary-button" onClick={() => applyPreset("balanced")} type="button">Reset demo</button>
          </div>
          {error && <p className="alert-error">{error}</p>}
          {plan?.warnings.length ? <div className="space-y-2">{plan.warnings.map((warning) => <p className="alert-error" key={warning}>{warning}</p>)}</div> : null}
          {plan ? (
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Debt pressure</p>
                <p className="mt-1 text-2xl font-bold">{formatPercent(plan.debt_to_income_ratio)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Fixed share</p>
                <p className="mt-1 text-2xl font-bold">{formatPercent((plan.monthly_fixed_costs / plan.income) * 100)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Mode</p>
                <p className="mt-1 text-2xl font-bold capitalize">{plan.strategy_mode}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="panel-title">Allocation mix</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Percentages update with every plan calculation.</p>
              </div>
              <div className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950 dark:text-teal-200">Deterministic</div>
            </div>
            <div className="mt-4 h-80">
              {plan ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={plan.allocations} dataKey="amount" nameKey="bucket" innerRadius={72} outerRadius={120} paddingAngle={2}>
                      {plan.allocations.map((item, index) => <Cell key={item.bucket} fill={colors[index % colors.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Build a plan to see the mix</div>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            {plan?.allocations.length ? plan.allocations.map((item) => (
              <div className="panel" key={item.bucket}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="panel-title">{item.bucket}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.rationale}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(item.amount)}</p>
                    <p className="text-sm text-slate-500">{formatPercent(item.percentage)}</p>
                  </div>
                </div>
              </div>
            )) : <EmptyState title="No allocation yet" body="Generate a salary split to see the recommended allocation mix." />}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="panel space-y-3">
          <h3 className="panel-title">Why this split</h3>
          {plan?.reasoning.map((item) => (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-950/60 dark:text-slate-200" key={item}>
              {item}
            </p>
          ))}
        </div>
        <div className="panel space-y-3">
          <h3 className="panel-title">Formula snapshot</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">Debt pressure = debt load / monthly salary.</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Fixed share = fixed costs / monthly salary.</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Residual cash = salary - fixed bills - debt - emergency savings - investments.</p>
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Educational guidance only. If debt pressure is high, reduce new borrowing before increasing equity risk.
          </p>
        </div>
      </section>
    </div>
  );
}
