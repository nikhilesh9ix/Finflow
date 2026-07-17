import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../components/Badge";
import { Card, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/State";
import { api, type AnalyticsSummary, type Transaction } from "../services/api";
import {
  PIE_COLORS,
  sampleCategoryBreakdown,
  sampleCurrentMonth,
  sampleMonthlyTrend,
  sampleTransactions,
} from "../store/sampleData";
import { formatCurrency } from "../utils/format";

const PIE_DOT_CLASSES = ["bg-teal-500", "bg-teal-700", "bg-amber-500", "bg-indigo-500", "bg-pink-500", "bg-slate-400", "bg-orange-500", "bg-violet-500"];

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

export function DashboardPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSummary = useCallback(() => {
    setIsLoading(true);
    api.getAnalyticsSummary()
      .then((data) => {
        const hasData = data.category_breakdown.length > 0 || data.recent_transactions.length > 0;
        setSummary(data);
        setUsingSampleData(!hasData);
        setError("");
      })
      .catch((err) => {
        setSummary(null);
        setUsingSampleData(true);
        setError(err instanceof Error ? err.message : "Unable to load dashboard data");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const currentMonth = summary?.current_month ?? sampleCurrentMonth;
  const monthlyTrend = summary?.monthly_spend.length ? summary.monthly_spend : sampleMonthlyTrend;
  const categoryBreakdown = summary?.category_breakdown.length ? summary.category_breakdown.slice(0, 5) : sampleCategoryBreakdown;
  const recentTransactions: Transaction[] = summary?.recent_transactions.length
    ? summary.recent_transactions.slice(0, 5)
    : sampleTransactions.slice(0, 5);

  const pieData = useMemo(
    () => categoryBreakdown.map((item, index) => ({
      ...item,
      fill: PIE_COLORS[index % PIE_COLORS.length],
    })),
    [categoryBreakdown],
  );

  if (isLoading) return <LoadingSkeleton variant="cards" />;

  return (
    <div className="space-y-6">
      {usingSampleData && (
        <ErrorState
          message={error || "Showing demo analytics until live backend data is available."}
          action={<Button onClick={loadSummary} type="button" variant="secondary">Retry</Button>}
        />
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <Badge tone="success">This month</Badge>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">Total income</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-300">{formatCurrency(currentMonth.income)}</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="rounded-lg bg-rose-50 p-2 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <Badge tone="danger">This month</Badge>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">Total expenses</p>
          <p className="mt-1 text-2xl font-black text-rose-600 dark:text-rose-300">{formatCurrency(currentMonth.expense)}</p>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="rounded-lg bg-teal-50 p-2 text-teal-700 dark:bg-teal-500/15 dark:text-teal-200">
              <TrendingUp className="h-5 w-5" />
            </div>
            <Badge tone={currentMonth.net >= 0 ? "success" : "danger"}>{currentMonth.net >= 0 ? "Surplus" : "Deficit"}</Badge>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-500 dark:text-slate-400">Net this month</p>
          <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{formatCurrency(currentMonth.net)}</p>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Spending mix" title="Category-wise breakdown" />
          {pieData.length === 0 ? (
            <EmptyState title="No expense data" body="Upload transactions to see category breakdown." />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={pieData}
                    dataKey="amount"
                    innerRadius={55}
                    nameKey="category"
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell fill={entry.fill} key={entry.category} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {pieData.map((item) => (
                  <span className="inline-flex items-center gap-1.5" key={item.category}>
                    <span className={`h-2.5 w-2.5 rounded-full ${PIE_DOT_CLASSES[pieData.indexOf(item) % PIE_DOT_CLASSES.length]}`} />
                    {item.category}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader eyebrow="Trend" title="Monthly spend" />
          {monthlyTrend.length === 0 ? (
            <EmptyState title="No trend data" body="Add transactions across months to see spending trends." />
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={formatMonthLabel} tickLine={false} />
                  <YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(label) => formatMonthLabel(String(label))} />
                  <Bar dataKey="spend" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader eyebrow="Top 5" title="Spending categories" />
          {categoryBreakdown.length === 0 ? (
            <EmptyState title="No categories yet" body="Expense transactions will appear here." />
          ) : (
            <div className="space-y-4">
              {categoryBreakdown.map((item, index) => {
                const maxAmount = categoryBreakdown[0]?.amount ?? 1;
                const width = Math.max((item.amount / maxAmount) * 100, 8);
                return (
                  <div key={item.category}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{index + 1}. {item.category}</span>
                      <span className="text-slate-500">{formatCurrency(item.amount)}</span>
                    </div>
                    <progress className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" max={100} value={Math.min(width, 100)} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader eyebrow="Recent activity" title="Latest transactions" />
          {recentTransactions.length === 0 ? (
            <EmptyState title="No transactions yet" body="Upload a CSV to see activity here." />
          ) : (
            <div className="grid gap-3">
              {recentTransactions.map((transaction) => (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-slate-950" key={`${transaction.id}-${transaction.transaction_date}`}>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-950 dark:text-white">{transaction.description}</p>
                    <p className="text-sm text-slate-500">{transaction.category} · {transaction.transaction_date}</p>
                  </div>
                  <p className={transaction.amount < 0 ? "shrink-0 font-black text-rose-600 dark:text-rose-300" : "shrink-0 font-black text-emerald-600 dark:text-emerald-300"}>
                    {formatCurrency(transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
