import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { isAuthError, isBackendUnreachable } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { useCreateDebt, useDebtStrategy, useDeleteDebt } from "../lib/queries";

const DEBT_TYPES = ["Home Loan", "Car Loan", "Personal Loan", "Credit Card", "Education Loan", "Other"];

function DebtForm({ onDone }: { onDone: () => void }) {
  const createDebt = useCreateDebt();
  const [form, setForm] = useState({
    lender: "",
    debt_type: DEBT_TYPES[0],
    outstanding_amount: "",
    interest_rate: "",
    emi_amount: "",
    due_day: "5",
  });
  const [error, setError] = useState("");

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <form
      className="panel space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const payload = {
          lender: form.lender.trim(),
          debt_type: form.debt_type,
          outstanding_amount: Number(form.outstanding_amount),
          interest_rate: Number(form.interest_rate),
          emi_amount: Number(form.emi_amount),
          due_day: Number(form.due_day),
        };
        if (!payload.lender) return setError("Enter the lender name.");
        if (!(payload.outstanding_amount > 0)) return setError("Outstanding amount must be greater than zero.");
        if (!(payload.emi_amount > 0)) return setError("EMI must be greater than zero.");
        if (payload.interest_rate < 0) return setError("Interest rate cannot be negative.");
        if (payload.due_day < 1 || payload.due_day > 31) return setError("Due day must be between 1 and 31.");
        try {
          await createDebt.mutateAsync(payload);
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save debt account");
        }
      }}
    >
      <h3 className="panel-title">New debt account</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="form-label" htmlFor="debt-lender">Lender</label>
          <input className="input mt-2" id="debt-lender" onChange={update("lender")} placeholder="HDFC Bank" value={form.lender} />
        </div>
        <div>
          <label className="form-label" htmlFor="debt-type">Type</label>
          <select className="input mt-2" id="debt-type" onChange={update("debt_type")} value={form.debt_type}>
            {DEBT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="debt-outstanding">Outstanding (₹)</label>
          <input className="input mt-2" id="debt-outstanding" min="1" onChange={update("outstanding_amount")} placeholder="2840000" type="number" value={form.outstanding_amount} />
        </div>
        <div>
          <label className="form-label" htmlFor="debt-rate">Interest rate (% APR)</label>
          <input className="input mt-2" id="debt-rate" min="0" onChange={update("interest_rate")} placeholder="8.65" step="0.01" type="number" value={form.interest_rate} />
        </div>
        <div>
          <label className="form-label" htmlFor="debt-emi">Monthly EMI (₹)</label>
          <input className="input mt-2" id="debt-emi" min="1" onChange={update("emi_amount")} placeholder="21000" type="number" value={form.emi_amount} />
        </div>
        <div>
          <label className="form-label" htmlFor="debt-due">Due day</label>
          <input className="input mt-2" id="debt-due" max="31" min="1" onChange={update("due_day")} type="number" value={form.due_day} />
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={createDebt.isPending} type="submit">
        {createDebt.isPending ? "Saving…" : "Save debt account"}
      </button>
    </form>
  );
}

export function DebtsPage() {
  const { data: strategy, isLoading, isError, error } = useDebtStrategy();
  const deleteDebt = useDeleteDebt();
  const [showForm, setShowForm] = useState(false);

  if (isLoading && !strategy) return <LoadingSkeleton variant="cards" />;

  const accounts = strategy?.priority ?? [];
  const totalOutstanding = strategy?.total_outstanding ?? 0;
  const monthlyEmi = strategy?.monthly_emi ?? 0;

  // Payoff projection: amortise every account at its own rate and EMI, then sum.
  // This used to apply a flat 1.5% a month (18% APR) to the combined balance, which
  // overstated a 9.4% car loan by ₹1.1 lakh after two years and made an 8.65% home
  // loan look like it never shrank (1.5% interest exceeded its EMI).
  const PROJECTION_MONTHS = 24;
  const balances = accounts.map((a) => Number(a.outstanding_amount));
  // An account whose EMI does not cover its monthly interest will never be repaid.
  const underwater = accounts.filter(
    (a) => Number(a.emi_amount) <= Number(a.outstanding_amount) * (Number(a.interest_rate) / 1200),
  );
  const projection: { month: number; remaining: number }[] = [];
  for (let month = 1; month <= PROJECTION_MONTHS && accounts.length > 0; month++) {
    accounts.forEach((a, i) => {
      if (balances[i] <= 0) return;
      const interest = balances[i] * (Number(a.interest_rate) / 1200);
      balances[i] = Math.max(balances[i] + interest - Number(a.emi_amount), 0);
    });
    const remaining = Math.round(balances.reduce((sum, b) => sum + b, 0));
    projection.push({ month, remaining });
    if (remaining === 0) break;
  }

  return (
    <div className="space-y-6">
      {isError && !isAuthError(error) && (
        <ErrorState
          title={isBackendUnreachable(error) ? "Debt data unavailable" : "Could not load debt data"}
          body={error instanceof Error ? error.message : "Backend unavailable"}
        />
      )}

      <section className="hero-panel flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker">Debt control</p>
          <h2 className="section-title">Debt manager</h2>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Ranked by interest rate (avalanche method). Pay minimums on all, then throw extra at
            the highest-rate balance first.
          </p>
        </div>
        <button className="primary-button shrink-0" onClick={() => setShowForm((v) => !v)} type="button">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {showForm ? "Cancel" : "Add debt"}
        </button>
      </section>

      {showForm && <DebtForm onDone={() => setShowForm(false)} />}

      {/* Summary stats */}
      {strategy && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total outstanding</p>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">{formatCurrency(totalOutstanding)}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Monthly EMI</p>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">{formatCurrency(monthlyEmi)}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Accounts</p>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">{accounts.length}</p>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          title="No debt accounts"
          body="Add your loans and credit cards to get an avalanche payoff order and see how much interest you are carrying. Nothing here is shared — it stays in your account."
          action={
            <button className="primary-button" onClick={() => setShowForm(true)} type="button">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add your first debt
            </button>
          }
        />
      ) : (
        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          {/* Debt cards — avalanche order */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="panel-title">Avalanche order</h3>
              <span className="badge-danger">Highest interest first</span>
            </div>
            {accounts.map((account, index) => (
              <div
                className="panel"
                key={account.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Rank {index + 1}
                    </p>
                    <h4 className="mt-1 text-lg font-bold">{account.lender}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{account.debt_type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-danger">{Number(account.interest_rate).toFixed(2)}% APR</span>
                    <button
                      aria-label={`Delete ${account.lender} account`}
                      className="rounded-lg p-1.5 text-slate-500 dark:text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      onClick={() => {
                        if (window.confirm(`Delete the ${account.lender} ${account.debt_type}? This cannot be undone.`)) {
                          deleteDebt.mutate(account.id);
                        }
                      }}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <p className="mt-4 text-2xl font-extrabold tabular-nums">
                  {formatCurrency(account.outstanding_amount)}
                </p>
                <div className="mt-2 flex gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <span>EMI {formatCurrency(account.emi_amount)}</span>
                  <span>Due day {account.due_day}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Payoff timeline chart */}
          <div className="panel">
            <h3 className="panel-title">Payoff projection</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {projection.length > 0 && projection[projection.length - 1].remaining === 0
                ? `All accounts repaid in ${projection.length} months at current EMIs.`
                : `Remaining balance over the next ${projection.length} months at each loan's own interest rate.`}
            </p>
            {underwater.length > 0 && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                {underwater.map((a) => a.lender).join(", ")}: the EMI does not cover the monthly
                interest, so the balance will not go down. Raise the EMI or refinance.
              </p>
            )}
            <div className="mt-5 h-72">
              {projection.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projection}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(v) => `M${v}`}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `₹${Number(v) / 1000}k`}
                      tick={{ fill: "#64748b", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value)), "Remaining"]}
                    />
                    <Bar dataKey="remaining" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 dark:text-slate-400 dark:border-slate-700">
                  No projection data
                </div>
              )}
            </div>

            {strategy?.insight && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                {strategy.insight}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
