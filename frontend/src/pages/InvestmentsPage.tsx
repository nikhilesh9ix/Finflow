import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { useToast } from "../components/ToastProvider";
import { apiFetch } from "../lib/api";
import { demoInvestmentRecommendation, fallbackNotice } from "../lib/demoData";
import { formatCurrency, formatPercent } from "../lib/format";
import type { InvestmentRecommendation } from "../types";

const colors = ["#0f766e", "#1d4ed8", "#7c3aed", "#d97706", "#475569"];

const stepPresets = {
  conservative: { age: 58, monthly_income: 120000, risk_tolerance: "safe", goal_horizon_years: 2, emergency_fund_status: "building", emergency_fund_months: 3 },
  balanced: { age: 34, monthly_income: 150000, risk_tolerance: "balanced", goal_horizon_years: 7, emergency_fund_status: "ready", emergency_fund_months: 6 },
  growth: { age: 27, monthly_income: 220000, risk_tolerance: "growth", goal_horizon_years: 12, emergency_fund_status: "ready", emergency_fund_months: 8 },
};

export function InvestmentsPage() {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(stepPresets.balanced);
  const [result, setResult] = useState<InvestmentRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchResult(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchResult(payload: typeof profile) {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<InvestmentRecommendation>("/profile/investment", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to generate investment suggestion";
      setError(message);
      setResult(demoInvestmentRecommendation);
      showToast(fallbackNotice, "info");
    } finally {
      setLoading(false);
    }
  }

  const goNext = () => setStep((current) => Math.min(current + 1, 3));
  const goBack = () => setStep((current) => Math.max(current - 1, 1));
  const runPreset = (key: keyof typeof stepPresets) => {
    const next = stepPresets[key];
    setProfile(next);
    void fetchResult(next);
  };

  if (!result && loading) return <LoadingSkeleton variant="cards" />;

  return (
    <div className="space-y-6">
      {error ? <ErrorState title="Investment suggestion fallback active" body={error} /> : null}
      <section className="hero-panel">
        <p className="section-kicker">Wealth builder</p>
        <h2 className="section-title">Investment profile</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Answer a few simple questions and get an educational allocation suggestion with conservative, balanced, or growth-oriented guidance.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(stepPresets).map(([key, preset]) => (
          <button className="panel text-left transition hover:-translate-y-0.5 hover:border-teal-400" key={key} onClick={() => runPreset(key as keyof typeof stepPresets)} type="button">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Demo example</p>
            <h3 className="mt-1 text-lg font-semibold capitalize">{key}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Age {preset.age} | Horizon {preset.goal_horizon_years} years</p>
          </button>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="panel space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Step {step} of 3</p>
            <h3 className="panel-title">Profile questionnaire</h3>
          </div>

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2"><span className="form-label">Age</span><input className="input" type="number" value={profile.age} onChange={(event) => setProfile({ ...profile, age: Number(event.target.value) })} /></label>
              <label className="space-y-2"><span className="form-label">Monthly income</span><input className="input" type="number" value={profile.monthly_income} onChange={(event) => setProfile({ ...profile, monthly_income: Number(event.target.value) })} /></label>
            </div>
          ) : null}
          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="form-label">Risk tolerance</span>
                <select className="input" value={profile.risk_tolerance} onChange={(event) => setProfile({ ...profile, risk_tolerance: event.target.value })}>
                  <option value="safe">Safe</option>
                  <option value="balanced">Balanced</option>
                  <option value="growth">Growth</option>
                </select>
              </label>
              <label className="space-y-2"><span className="form-label">Goal horizon (years)</span><input className="input" type="number" value={profile.goal_horizon_years} onChange={(event) => setProfile({ ...profile, goal_horizon_years: Number(event.target.value) })} /></label>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="form-label">Emergency fund status</span>
                <select className="input" value={profile.emergency_fund_status} onChange={(event) => setProfile({ ...profile, emergency_fund_status: event.target.value })}>
                  <option value="building">Building</option>
                  <option value="ready">Ready</option>
                  <option value="complete">Complete</option>
                </select>
              </label>
              <label className="space-y-2"><span className="form-label">Emergency fund months</span><input className="input" type="number" value={profile.emergency_fund_months} onChange={(event) => setProfile({ ...profile, emergency_fund_months: Number(event.target.value) })} /></label>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button className="secondary-button" disabled={step === 1} onClick={goBack} type="button">Back</button>
            {step < 3 ? (
              <button className="primary-button" onClick={goNext} type="button">Next</button>
            ) : (
              <button className="primary-button" onClick={() => void fetchResult(profile)} type="button">Generate suggestion</button>
            )}
          </div>

          <p className="alert-info">
            Educational guidance only. This module avoids unsafe or legally risky advice and does not replace a licensed adviser.
          </p>
        </div>

        <div className="space-y-6">
          <div className="panel">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="panel-title">Suggested split</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Stored recommendation for the current profile.</p>
              </div>
              <span className="badge-success capitalize">{result?.profile_mode ?? "pending"}</span>
            </div>
            <div className="mt-4 h-80">
              {result ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={result.buckets} dataKey="amount" nameKey="category" innerRadius={72} outerRadius={120} paddingAngle={2}>
                      {result.buckets.map((item, index) => <Cell key={item.category} fill={colors[index % colors.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">Finish the questionnaire to see the split</div>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            {result?.buckets.map((bucket) => (
              <div className="panel" key={bucket.category}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="panel-title">{bucket.category}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{bucket.rationale}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(bucket.amount)}</p>
                    <p className="text-sm text-slate-500">{formatPercent(bucket.percentage)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="panel space-y-3">
          <h3 className="panel-title">Plain-English explanation</h3>
          {result?.reasoning.map((line) => <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-slate-950/60 dark:text-slate-200" key={line}>{line}</p>)}
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">{result?.disclaimer ?? "Educational guidance only."}</p>
        </div>
        <div className="panel space-y-3">
          <h3 className="panel-title">Projection notes</h3>
          {result?.projection_notes.map((line) => <p className="text-sm text-slate-600 dark:text-slate-300" key={line}>{line}</p>)}
          <p className="text-sm text-slate-600 dark:text-slate-300">Suggestion categories: emergency fund, fixed deposit, liquid fund, index fund SIP, and gold ETF.</p>
        </div>
      </section>
    </div>
  );
}
