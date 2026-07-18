import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { formatCurrency, formatPercent } from "../lib/format";
import { useSalaryPlan } from "../lib/queries";
import { useAuthStore } from "../store/auth";

const COLORS = ["#0f766e", "#1d4ed8", "#7c3aed", "#d97706", "#475569"];

export function SalaryPage() {
  const user = useAuthStore((state) => state.user);
  const { data: plan, isLoading, isError, error } = useSalaryPlan();

  if (isLoading && !plan) return <LoadingSkeleton variant="cards" />;

  const income = Number(plan?.income ?? user?.monthly_income ?? 0);
  const allocations = plan?.allocations ?? [];

  const essentials = allocations.find((a) => a.bucket === "Essentials");
  const debtEmi = allocations.find((a) => a.bucket === "Debt EMIs");

  const debtToIncomeRatio = income > 0 ? ((debtEmi?.amount ?? 0) / income) * 100 : 0;
  const fixedShare = income > 0 ? (((essentials?.amount ?? 0) + (debtEmi?.amount ?? 0)) / income) * 100 : 0;

  return (
    <div className="space-y-6">
      {isError && (
        <ErrorState
          title="Salary plan unavailable"
          body={error instanceof Error ? error.message : "Backend unavailable"}
        />
      )}

      <section className="hero-panel">
        <p className="section-kicker">Salary day automation</p>
        <h2 className="section-title">Salary plan</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Computed from your configured income, debt EMIs, and investment profile. Splits your
          salary before you spend it.
        </p>
      </section>

      {!plan || allocations.length === 0 ? (
        <EmptyState
          title="No salary plan yet"
          body="Set your monthly income in Settings and add any debt accounts to generate a plan."
        />
      ) : (
        <>
          {/* Ratio stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Monthly income
              </p>
              <p className="mt-3 text-3xl font-extrabold tabular-nums">{formatCurrency(income)}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Debt pressure
              </p>
              <p
                className={`mt-3 text-3xl font-extrabold tabular-nums ${
                  debtToIncomeRatio > 40
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {formatPercent(debtToIncomeRatio)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {debtToIncomeRatio > 40 ? "High — reduce new debt" : "Within safe range"}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Fixed share
              </p>
              <p className="mt-3 text-3xl font-extrabold tabular-nums">
                {formatPercent(fixedShare)}
              </p>
              <p className="mt-1 text-xs text-slate-400">Essentials + EMIs</p>
            </div>
          </div>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            {/* Pie chart */}
            <div className="panel">
              <h3 className="panel-title">Allocation mix</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Recommended split for {formatCurrency(income)}/month
              </p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocations}
                      dataKey="amount"
                      nameKey="bucket"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                    >
                      {allocations.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-3">
                {allocations.map((a, i) => (
                  <div key={a.bucket} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium">{a.bucket}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{formatCurrency(a.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Allocation detail cards */}
            <div className="space-y-4">
              {allocations.map((a, i) => (
                <div className="panel" key={a.bucket}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="mt-1 h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{a.bucket}</h4>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{a.note}</p>
                      </div>
                    </div>
                    <p className="text-lg font-extrabold tabular-nums flex-shrink-0">
                      {formatCurrency(a.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h3 className="panel-title mb-3">Formula</h3>
            <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <p>Essentials cap: 50% of income · Debt EMIs: pulled from your debt accounts</p>
              <p>Emergency fund: 15% cap until target reached · Investments: from investment profile</p>
              <p>Flexible: income − essentials − debt − emergency − investments</p>
              <p className="rounded-xl border border-amber-200 bg-amber-50/70 mt-2 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 font-medium">
                Rule-of-thumb guidance only. Tax treatment, existing SIPs, and income
                irregularity may change the ideal split. Consult a certified financial planner.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
