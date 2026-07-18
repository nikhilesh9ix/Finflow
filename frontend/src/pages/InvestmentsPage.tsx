import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { formatCurrency } from "../lib/format";
import { useInvestmentProfile } from "../lib/queries";

const COLORS = ["#0f766e", "#1d4ed8", "#7c3aed", "#d97706", "#475569"];

export function InvestmentsPage() {
  const { data: profile, isLoading, isError, error } = useInvestmentProfile();

  if (isLoading && !profile) return <LoadingSkeleton variant="cards" />;

  const emergencyFundProgress =
    profile && profile.emergency_fund_target > 0
      ? Math.min((profile.emergency_fund_current / profile.emergency_fund_target) * 100, 100)
      : 0;

  // Suggested allocation buckets based on risk profile and investment capacity
  const buckets = profile
    ? (() => {
        const capacity = Number(profile.monthly_investment_capacity);
        const isConservative = profile.risk_profile === "conservative" || profile.risk_profile === "safe";
        const isGrowth = profile.risk_profile === "growth" || profile.risk_profile === "aggressive";
        return [
          { name: "Index Fund SIP", amount: Math.round(capacity * (isGrowth ? 0.45 : isConservative ? 0.2 : 0.35)) },
          { name: "Emergency Fund", amount: Math.round(capacity * (isConservative ? 0.25 : 0.15)) },
          { name: "Fixed Deposit", amount: Math.round(capacity * (isConservative ? 0.3 : isGrowth ? 0.1 : 0.2)) },
          { name: "Gold ETF", amount: Math.round(capacity * 0.1) },
          { name: "Liquid Fund", amount: Math.round(capacity * (isGrowth ? 0.1 : 0.2)) },
        ].filter((b) => b.amount > 0);
      })()
    : [];

  return (
    <div className="space-y-6">
      {isError && (
        <ErrorState
          title="Could not load investment profile"
          body={error instanceof Error ? error.message : "Backend unavailable"}
        />
      )}

      <section className="hero-panel">
        <p className="section-kicker">Wealth builder</p>
        <h2 className="section-title">Investment profile</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Your risk profile, emergency fund readiness, and monthly investment capacity — all from
          your actual account data.
        </p>
      </section>

      {!profile ? (
        <EmptyState
          title="No investment profile"
          body="Your profile is created automatically on registration. Contact support if missing."
        />
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Risk profile</p>
              <p className="mt-3 text-2xl font-extrabold capitalize">{profile.risk_profile}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Monthly capacity</p>
              <p className="mt-3 text-2xl font-extrabold tabular-nums">
                {formatCurrency(profile.monthly_investment_capacity)}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Emergency target</p>
              <p className="mt-3 text-2xl font-extrabold tabular-nums">
                {formatCurrency(profile.emergency_fund_target)}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Emergency gap</p>
              <p className="mt-3 text-2xl font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
                {formatCurrency(profile.emergency_gap ?? (profile.emergency_fund_target - profile.emergency_fund_current))}
              </p>
            </div>
          </div>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            {/* Suggested allocation pie */}
            <div className="panel">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="panel-title">Suggested allocation</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Based on {profile.risk_profile} risk profile ·{" "}
                    {formatCurrency(profile.monthly_investment_capacity)}/mo capacity
                  </p>
                </div>
                <span className="badge-success capitalize">{profile.risk_profile}</span>
              </div>
              <div className="mt-4 h-72">
                {buckets.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={buckets}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={2}
                      >
                        {buckets.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="grid h-full place-items-center text-sm text-slate-500">
                    Set monthly investment capacity to see the allocation split
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {buckets.map((b, i) => (
                  <div key={b.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium">{b.name}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums">{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency fund gauge */}
            <div className="space-y-6">
              <div className="panel">
                <h3 className="panel-title">Emergency fund</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Target: 3–6 months of expenses
                </p>
                <div className="mt-5">
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>{formatCurrency(profile.emergency_fund_current)} saved</span>
                    <span className="text-slate-500">{Math.round(emergencyFundProgress)}%</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${emergencyFundProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Target: {formatCurrency(profile.emergency_fund_target)}
                  </p>
                </div>
              </div>

              <div className="panel">
                <h3 className="panel-title">Readiness</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {profile.readiness}
                </p>
                {profile.notes && (
                  <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
                    {profile.notes}
                  </p>
                )}
              </div>

              <div className="panel">
                <p className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 font-medium">
                  Educational guidance only. Allocations do not account for tax implications, existing
                  holdings, or dependents. Consult a SEBI-registered advisor before investing.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
