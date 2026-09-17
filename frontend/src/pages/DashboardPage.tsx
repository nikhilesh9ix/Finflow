import { AlertTriangle, PiggyBank, TrendingDown, Wallet } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { isAuthError, isBackendUnreachable } from "../lib/api";
import { formatCurrency, formatMonth, formatPercent } from "../lib/format";
import { useDashboardSummary } from "../lib/queries";
import type { DashboardSummary } from "../types";

const EMPTY_SUMMARY: DashboardSummary = {
  month: "",
  income_is_estimated: false,
  monthly_income: 0,
  actual_income: 0,
  monthly_spend: 0,
  invested: 0,
  projected_savings: 0,
  savings_rate: 0,
  category_spend: [],
  budget_health: [],
  recent_transactions: [],
};

export function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboardSummary();

  if (isLoading && !data) return <LoadingSkeleton />;

  // Real zeros until the API answers — never invented numbers.
  const summary: DashboardSummary = data ?? EMPTY_SUMMARY;

  // Statements are imported after the fact, so the figures are for the latest
  // month in the data — label them with that month, not "this month".
  const monthLabel = summary.month ? formatMonth(summary.month) : "this month";

  const statCards = [
    {
      label: "Monthly income",
      value: formatCurrency(summary.monthly_income),
      // Income is a 3-month average; call out a month that differs from it.
      subLabel: summary.actual_income !== summary.monthly_income
        ? `${formatCurrency(summary.actual_income)} received in ${monthLabel}`
        : undefined,
      icon: Wallet,
      colorClass:
        "text-emerald-700 bg-emerald-50/80 dark:text-emerald-400 dark:bg-emerald-950/30",
    },
    {
      label: `Spend · ${monthLabel}`,
      value: formatCurrency(summary.monthly_spend),
      subLabel: summary.invested > 0 ? "Excludes investments" : undefined,
      icon: TrendingDown,
      colorClass: "text-rose-700 bg-rose-50/80 dark:text-rose-400 dark:bg-rose-950/30",
    },
    {
      label: "Projected savings",
      value: formatCurrency(summary.projected_savings),
      subLabel: summary.income_is_estimated
        ? "No salary credited yet — based on your average income"
        : summary.invested > 0
          ? `${formatCurrency(summary.invested)} invested`
          : undefined,
      icon: PiggyBank,
      colorClass: "text-cyan-600 bg-cyan-50/80 dark:text-cyan-400 dark:bg-cyan-950/30",
    },
    {
      label: "Savings rate",
      value: formatPercent(summary.savings_rate),
      icon: AlertTriangle,
      colorClass:
        "text-violet-600 bg-violet-50/80 dark:text-violet-400 dark:bg-violet-950/30",
    },
  ];

  const categoryData = summary.category_spend.length
    ? summary.category_spend
    : [{ category: "No data yet", amount: 0 }];

  // Nothing imported yet — show the import prompt rather than a grid of zeros.
  const isEmpty =
    !isError && summary.recent_transactions.length === 0 && summary.category_spend.length === 0;

  return (
    <div className="space-y-6 lg:space-y-8">
      {isError && !isAuthError(error) ? (
        <ErrorState
          title={isBackendUnreachable(error) ? "Live data unavailable" : "Could not load your data"}
          body={error instanceof Error ? error.message : "API error"}
        />
      ) : null}

      <section className="hero-panel">
        <p className="section-kicker">Command center</p>
        <h2 className="section-title">Financial cockpit</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300 font-medium">
          A calm, high-signal view of your cash flow, spending pressure, and
          opportunities to improve your runway.
        </p>
      </section>

      {isEmpty && (
        <EmptyState
          title="No transactions yet"
          body="Import a bank statement CSV to populate your cockpit. Every number here is computed from your own data."
          action={
            <Link className="primary-button" to="/transactions">
              Import transactions
            </Link>
          }
        />
      )}

      {/* Stat cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            className="stat-card flex flex-col justify-between"
            key={card.label}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold tracking-tight text-slate-500 dark:text-slate-400">
                {card.label}
              </span>
              <div className={`rounded-xl p-2.5 ${card.colorClass}`}>
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {card.value}
            </p>
            {card.subLabel ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {card.subLabel}
              </p>
            ) : null}
          </div>
        ))}
      </section>

      {/* Charts */}
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Category spend bar chart */}
        <div className="panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="panel-title">Category spend</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Where your money went in {monthLabel}.
              </p>
            </div>
          </div>
          <div className="mt-5 h-80" role="img" aria-label="Category spend bar chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#94a3b8"
                  opacity={0.12}
                />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
                />
                <YAxis
                  tickFormatter={(v: number) => `₹${v / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), "Spent"]}
                  cursor={{ fill: "rgba(13,148,136,0.03)" }}
                />
                <Bar dataKey="amount" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget health */}
        <div className="panel">
          <h3 className="panel-title">Budget health</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Spot pressure points before they become surprises.
          </p>
          <div className="mt-5 space-y-4">
            {summary.budget_health.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No budgets set up yet. Add budgets to track health.
              </p>
            ) : (
              summary.budget_health.map((item) => {
                const progress = item.limit > 0 ? Math.min((item.spent / item.limit) * 100, 100) : 0;
                const isOver = item.status === "over";
                const isWarning = item.status === "warning";
                return (
                  <div
                    key={item.category}
                    className="rounded-2xl border border-slate-200/50 bg-slate-50/50 p-4.5 transition hover:border-slate-300 dark:border-slate-800/60 dark:bg-slate-950/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {item.category}
                      </p>
                      {/* "warning" used to fall through to the green success style. */}
                      <span className={isOver ? "badge-danger" : isWarning ? "badge-warning" : "badge-success"}>
                        {isOver ? "Over" : isWarning ? "Warning" : "On track"}
                      </span>
                    </div>
                    <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isOver
                            ? "bg-rose-500"
                            : isWarning
                              ? "bg-amber-500"
                              : "bg-linear-to-r from-teal-500 to-cyan-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span>
                        {formatCurrency(item.spent)} of {formatCurrency(item.limit)}
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Recent transactions */}
      {summary.recent_transactions.length > 0 && (
        <section className="panel">
          <h3 className="panel-title">Recent transactions</h3>
          <p className="mt-1 mb-5 text-sm text-slate-500 dark:text-slate-400">
            Last {summary.recent_transactions.length} transactions across all categories.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/60">
                  <th className="pb-3 text-left font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Date
                  </th>
                  <th className="pb-3 text-left font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Description
                  </th>
                  <th className="pb-3 text-left font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Category
                  </th>
                  <th className="pb-3 text-right font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {summary.recent_transactions.map((tx) => (
                  <tr key={tx.id} className="group">
                    <td className="whitespace-nowrap py-3 text-slate-500 dark:text-slate-400 tabular-nums">
                      {tx.transaction_date}
                    </td>
                    <td className="py-3 font-medium text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                      {tx.description}
                    </td>
                    <td className="py-3">
                      <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {tx.category}
                      </span>
                    </td>
                    <td
                      className={`py-3 text-right font-bold tabular-nums ${
                        tx.amount >= 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {/* Sign as well as colour, so income vs spend does not rely on colour alone. */}
                      {tx.amount >= 0 ? "+" : "−"}
                      {formatCurrency(Math.abs(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
