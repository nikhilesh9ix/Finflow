import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { formatCurrency } from "../lib/format";
import { useDebtStrategy } from "../lib/queries";

export function DebtsPage() {
  const { data: strategy, isLoading, isError, error } = useDebtStrategy();

  if (isLoading && !strategy) return <LoadingSkeleton variant="cards" />;

  const accounts = strategy?.priority ?? [];
  const totalOutstanding = strategy?.total_outstanding ?? 0;
  const monthlyEmi = strategy?.monthly_emi ?? 0;

  // Avalanche payoff projection — each month principal reduces by EMI - interest estimate
  const projection = (() => {
    if (!accounts.length) return [];
    let remaining = totalOutstanding;
    return Array.from({ length: Math.min(24, 24) }, (_, i) => {
      const interest = remaining * 0.015; // rough monthly average interest
      const principal = Math.max(monthlyEmi - interest, 0);
      remaining = Math.max(remaining - principal, 0);
      return { month: i + 1, remaining: Math.round(remaining) };
    }).filter((d) => d.remaining > 0);
  })();

  return (
    <div className="space-y-6">
      {isError && (
        <ErrorState
          title="Could not load debt data"
          body={error instanceof Error ? error.message : "Backend unavailable"}
        />
      )}

      <section className="hero-panel">
        <p className="section-kicker">Debt control</p>
        <h2 className="section-title">Debt manager</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Ranked by interest rate (avalanche method). Pay minimums on all, then throw extra at
          the highest-rate balance first.
        </p>
      </section>

      {/* Summary stats */}
      {strategy && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total outstanding</p>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">{formatCurrency(totalOutstanding)}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly EMI</p>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">{formatCurrency(monthlyEmi)}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Accounts</p>
            <p className="mt-3 text-3xl font-extrabold tabular-nums">{accounts.length}</p>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          title="No debt accounts"
          body="Add debt accounts via the API to track balances and get a payoff plan."
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Rank {index + 1}
                    </p>
                    <h4 className="mt-1 text-lg font-bold">{account.lender}</h4>
                    <p className="text-sm text-slate-500">{account.debt_type}</p>
                  </div>
                  <span className="badge-danger">{Number(account.interest_rate).toFixed(2)}% APR</span>
                </div>
                <p className="mt-4 text-2xl font-extrabold tabular-nums">
                  {formatCurrency(account.outstanding_amount)}
                </p>
                <div className="mt-2 flex gap-4 text-sm text-slate-500">
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
              Estimated debt decay over next {projection.length} months at current EMI.
            </p>
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
                <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700">
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
