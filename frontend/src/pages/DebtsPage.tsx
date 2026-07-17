import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { useToast } from "../components/ToastProvider";
import { apiFetch } from "../lib/api";
import { demoDebtAudit, fallbackNotice } from "../lib/demoData";
import { formatCurrency, formatPercent } from "../lib/format";
import type { Debt, DebtAudit } from "../types";

const debtPresets = [
  { name: "Safe borrower", monthly_income: 95000, monthly_fixed_costs: 45000, extra_payment_capacity: 5000 },
  { name: "Tight month", monthly_income: 110000, monthly_fixed_costs: 62000, extra_payment_capacity: 0 },
  { name: "High leverage", monthly_income: 90000, monthly_fixed_costs: 52000, extra_payment_capacity: 3000 },
];

export function DebtsPage() {
  const { showToast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [audit, setAudit] = useState<DebtAudit | null>(null);
  const [form, setForm] = useState({ monthly_income: 125000, monthly_fixed_costs: 54000, extra_payment_capacity: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<Debt[]>("/debts").then(setDebts);
    void runAudit(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runAudit(payload: typeof form) {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<DebtAudit>("/debts/audit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setAudit(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to run debt audit";
      setError(message);
      setAudit(demoDebtAudit);
      showToast(fallbackNotice, "info");
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => (audit?.projection ?? []).slice(0, 12), [audit]);

  if (!debts.length && !audit && loading) return <LoadingSkeleton variant="cards" />;

  return (
    <div className="space-y-6">
      {error ? <ErrorState title="Debt audit fallback active" body={error} /> : null}
      <section className="hero-panel">
        <p className="section-kicker">Debt control</p>
        <h2 className="section-title">Debt manager</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Track debt accounts, estimate payoff time, and surface wealth leaks using deterministic rules that normal users can understand.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {debtPresets.map((preset) => (
          <button className="panel text-left transition hover:-translate-y-0.5 hover:border-teal-400" key={preset.name} onClick={() => { setForm(preset); void runAudit(preset); }} type="button">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Demo example</p>
            <h3 className="mt-1 text-lg font-semibold">{preset.name}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Income {formatCurrency(preset.monthly_income)} | Fixed costs {formatCurrency(preset.monthly_fixed_costs)}</p>
          </button>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="panel space-y-4">
          <h3 className="panel-title">Audit inputs</h3>
          <label className="space-y-2">
            <span className="form-label">Monthly income</span>
            <input className="input" type="number" value={form.monthly_income} onChange={(event) => setForm({ ...form, monthly_income: Number(event.target.value) })} />
          </label>
          <label className="space-y-2">
            <span className="form-label">Monthly fixed costs</span>
            <input className="input" type="number" value={form.monthly_fixed_costs} onChange={(event) => setForm({ ...form, monthly_fixed_costs: Number(event.target.value) })} />
          </label>
          <label className="space-y-2">
            <span className="form-label">Extra repayment capacity</span>
            <input className="input" type="number" value={form.extra_payment_capacity} onChange={(event) => setForm({ ...form, extra_payment_capacity: Number(event.target.value) })} />
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="primary-button" disabled={loading} onClick={() => void runAudit(form)} type="button">
              {loading ? "Analyzing..." : "Run debt audit"}
            </button>
            <button className="secondary-button" onClick={() => { setForm(debtPresets[1]); void runAudit(debtPresets[1]); }} type="button">Load demo</button>
          </div>
          {audit?.warnings.length ? (
            <div className="space-y-2">
              {audit.warnings.map((warning) => <p className="alert-error" key={warning}>{warning}</p>)}
            </div>
          ) : null}
          {audit ? (
            <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Debt-to-income</p>
                <p className="mt-1 text-2xl font-bold">{formatPercent(audit.debt_to_income_ratio)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Debt-free timeline</p>
                <p className="mt-1 text-2xl font-bold">{audit.debt_free_months} months</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Debt payment</p>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(audit.monthly_debt_payment)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Repayment budget</p>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(audit.monthly_repayment_budget)}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="panel-title">Debt cards</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Current debts and avalanche ranking.</p>
            </div>
            <span className="badge-danger">Avalanche</span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {(audit?.avalanche_order.length ? audit.avalanche_order : debts.length ? debts.map((debt, index) => ({
              rank: index + 1,
              lender: debt.lender,
              debt_type: debt.debt_type,
              outstanding_amount: debt.outstanding_amount,
              interest_rate: debt.interest_rate,
              emi_amount: debt.emi_amount,
              due_day: debt.due_day,
              rationale: "Add debt audit inputs to compute order and warnings.",
            })) : [{ rank: 1, lender: "No debts yet", debt_type: "Add debts to track repayments", outstanding_amount: 0, interest_rate: 0, emi_amount: 0, due_day: 1, rationale: "Create debt entries to see your priority order" }]).map((debt) => (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950" key={`${debt.rank}-${debt.lender}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Rank {debt.rank}</p>
                    <h4 className="mt-1 text-lg font-semibold">{debt.lender}</h4>
                    <p className="text-sm text-slate-500">{debt.debt_type}</p>
                  </div>
                  <span className="badge-danger">{debt.interest_rate}% APR</span>
                </div>
                <p className="mt-4 text-2xl font-bold">{formatCurrency(debt.outstanding_amount)}</p>
                <p className="mt-1 text-sm text-slate-500">EMI {formatCurrency(debt.emi_amount)} due day {debt.due_day}</p>
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200">{debt.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="panel-title">Timeline projection</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Projected debt decay over the next months.</p>
            </div>
          </div>
          <div className="mt-4 h-72">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="month" tickFormatter={(value) => `M${value}`} />
                  <YAxis tickFormatter={(value) => `INR ${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="remaining_debt" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Run the audit to see the projection</div>
            )}
          </div>
        </div>

        <div className="panel space-y-3">
          <h3 className="panel-title">Wealth leak audit</h3>
          {audit?.wealth_leaks.length ? audit.wealth_leaks.map((leak) => (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60" key={leak.title}>
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-semibold">{leak.title}</h4>
                <span className={leak.severity === "high" ? "badge-danger" : "badge-success"}>{leak.severity}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{leak.evidence}</p>
              <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">{leak.recommendation}</p>
            </div>
          )) : <p className="text-sm text-slate-500 dark:text-slate-400">No audit results yet. Run the calculator to surface subscriptions, idle cash, or overspending.</p>}
          {audit ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Debt-free estimate is a projection, not a promise. Interest rates, missed payments, and new borrowing will change the timeline.</p> : null}
        </div>
      </section>
    </div>
  );
}
