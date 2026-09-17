import { Pencil } from "lucide-react";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { isAuthError, isBackendUnreachable } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { useInvestmentProfile, useSaveInvestmentProfile } from "../lib/queries";
import type { InvestmentProfile } from "../types";

const COLORS = ["#0f766e", "#1d4ed8", "#7c3aed", "#d97706", "#475569"];
const RISK_PROFILES = ["conservative", "balanced", "growth"];

function ProfileForm({ profile, onDone }: { profile: InvestmentProfile | undefined; onDone: () => void }) {
  const saveProfile = useSaveInvestmentProfile();
  const [form, setForm] = useState({
    risk_profile: profile?.risk_profile ?? "balanced",
    monthly_investment_capacity: String(profile?.monthly_investment_capacity ?? ""),
    emergency_fund_target: String(profile?.emergency_fund_target ?? ""),
    emergency_fund_current: String(profile?.emergency_fund_current ?? ""),
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
          risk_profile: form.risk_profile,
          monthly_investment_capacity: Number(form.monthly_investment_capacity || 0),
          emergency_fund_target: Number(form.emergency_fund_target || 0),
          emergency_fund_current: Number(form.emergency_fund_current || 0),
        };
        if (Object.values(payload).some((v) => typeof v === "number" && (Number.isNaN(v) || v < 0))) {
          setError("Amounts must be zero or greater.");
          return;
        }
        try {
          await saveProfile.mutateAsync(payload);
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save profile");
        }
      }}
    >
      <h3 className="panel-title">Edit investment profile</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="form-label" htmlFor="risk">Risk profile</label>
          <select className="input mt-2" id="risk" onChange={update("risk_profile")} value={form.risk_profile}>
            {RISK_PROFILES.map((r) => (
              <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="capacity">Monthly investment capacity (₹)</label>
          <input className="input mt-2" id="capacity" min="0" onChange={update("monthly_investment_capacity")} placeholder="15000" step="1" type="number" value={form.monthly_investment_capacity} />
        </div>
        <div>
          <label className="form-label" htmlFor="ef-target">Emergency fund target (₹)</label>
          <input className="input mt-2" id="ef-target" min="0" onChange={update("emergency_fund_target")} placeholder="300000" step="1" type="number" value={form.emergency_fund_target} />
        </div>
        <div>
          <label className="form-label" htmlFor="ef-current">Emergency fund saved (₹)</label>
          <input className="input mt-2" id="ef-current" min="0" onChange={update("emergency_fund_current")} placeholder="50000" step="1" type="number" value={form.emergency_fund_current} />
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="primary-button" disabled={saveProfile.isPending} type="submit">
        {saveProfile.isPending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

export function InvestmentsPage() {
  const { data: profile, isLoading, isError, error } = useInvestmentProfile();
  const [editing, setEditing] = useState(false);

  if (isLoading && !profile) return <LoadingSkeleton variant="cards" />;

  // The backend auto-creates a zeroed profile on first read, so "no profile" is
  // really "profile with nothing filled in yet".
  const needsSetup =
    !isError &&
    Number(profile?.monthly_investment_capacity ?? 0) === 0 &&
    Number(profile?.emergency_fund_target ?? 0) === 0;

  // A fund saved beyond its target has no gap — never show a negative amount.
  const emergencyGap = profile
    ? Math.max(Number(profile.emergency_gap ?? profile.emergency_fund_target - profile.emergency_fund_current), 0)
    : 0;

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
        // Each profile's shares must total exactly 100%. They previously summed to
        // 105% for conservative (recommending more than the user can invest) and 90%
        // for growth (leaving a tenth unallocated).
        const shares = isConservative
          ? { sip: 0.2, emergency: 0.25, fd: 0.3, gold: 0.05, liquid: 0.2 }
          : isGrowth
            ? { sip: 0.55, emergency: 0.15, fd: 0.1, gold: 0.1, liquid: 0.1 }
            : { sip: 0.35, emergency: 0.15, fd: 0.2, gold: 0.1, liquid: 0.2 };
        // Only put toward the emergency fund what it still needs. Once the target is
        // met the page says "Emergency fund is ready", so recommending more
        // contributions contradicted it; the unused share goes to the SIP instead.
        const emergency =
          Number(profile.emergency_fund_target) > 0
            ? Math.min(Math.round(capacity * shares.emergency), Math.ceil(emergencyGap))
            : Math.round(capacity * shares.emergency);
        const sip = Math.round(capacity * shares.sip) + (Math.round(capacity * shares.emergency) - emergency);
        return [
          { name: "Index Fund SIP", amount: sip },
          { name: "Emergency Fund", amount: emergency },
          { name: "Fixed Deposit", amount: Math.round(capacity * shares.fd) },
          { name: "Gold ETF", amount: Math.round(capacity * shares.gold) },
          { name: "Liquid Fund", amount: Math.round(capacity * shares.liquid) },
        ].filter((b) => b.amount > 0);
      })()
    : [];

  return (
    <div className="space-y-6">
      {isError && !isAuthError(error) && (
        <ErrorState
          title={isBackendUnreachable(error) ? "Investment profile unavailable" : "Could not load investment profile"}
          body={error instanceof Error ? error.message : "Backend unavailable"}
        />
      )}

      <section className="hero-panel flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker">Wealth builder</p>
          <h2 className="section-title">Investment profile</h2>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
            Your risk profile, emergency fund readiness, and monthly investment capacity — all from
            your actual account data.
          </p>
        </div>
        <button className="primary-button shrink-0" onClick={() => setEditing((v) => !v)} type="button">
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {editing ? "Cancel" : "Edit profile"}
        </button>
      </section>

      {editing && <ProfileForm onDone={() => setEditing(false)} profile={profile} />}

      {needsSetup && !editing && (
        <EmptyState
          title="Set your investment capacity"
          body="Add how much you can invest each month and your emergency fund target to get a suggested allocation."
          action={
            <button className="primary-button" onClick={() => setEditing(true)} type="button">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Set up profile
            </button>
          }
        />
      )}

      {/* While the profile is empty the setup prompt above is the whole page; the
          cards below would only repeat it as a row of ₹0 values. */}
      {!profile || needsSetup ? null : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Risk profile</p>
              <p className="mt-3 text-2xl font-extrabold capitalize">{profile.risk_profile}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Monthly capacity</p>
              <p className="mt-3 text-2xl font-extrabold tabular-nums">
                {formatCurrency(profile.monthly_investment_capacity)}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Emergency target</p>
              <p className="mt-3 text-2xl font-extrabold tabular-nums">
                {formatCurrency(profile.emergency_fund_target)}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Emergency gap</p>
              <p className="mt-3 text-2xl font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
                {formatCurrency(emergencyGap)}
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
                  <div className="grid h-full place-items-center text-sm text-slate-500 dark:text-slate-400">
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
                  Aim for 3–6 months of expenses
                </p>
                <div className="mt-5">
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>{formatCurrency(profile.emergency_fund_current)} saved</span>
                    <span className="text-slate-500 dark:text-slate-400">{Math.round(emergencyFundProgress)}%</span>
                  </div>
                  <div className="h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${emergencyFundProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
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
