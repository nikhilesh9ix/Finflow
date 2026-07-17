import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/State";
import { api, type InvestmentProfile, type InvestmentProfileSummary, type SavingsGoal } from "../services/api";
import { investments as sampleInvestments } from "../store/sampleData";
import { formatCurrency } from "../utils/format";

type InvestmentCard = {
  name: string;
  value: number;
  target: number;
  risk: string;
  note?: string;
};

export function InvestmentsPage() {
  const [profile, setProfile] = useState<InvestmentProfile | null>(null);
  const [profileSummary, setProfileSummary] = useState<InvestmentProfileSummary | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadInvestments = useCallback(() => {
    setLoading(true);
    Promise.all([api.getInvestmentProfile(), api.getInvestmentProfileSummary(), api.getSavingsGoals()])
      .then(([profileData, summary, goalRows]) => {
        setProfile(profileData);
        setProfileSummary(summary);
        setGoals(goalRows);
        setUsingSampleData(goalRows.length === 0);
      })
      .catch(() => {
        setProfile(null);
        setProfileSummary(null);
        setGoals([]);
        setUsingSampleData(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments]);

  const cards = useMemo<InvestmentCard[]>(() => {
    if (profile) {
      const gap = Math.max(profile.emergency_fund_target - profile.emergency_fund_current, 0);
      return [
        {
          name: "Emergency fund",
          value: profile.emergency_fund_current,
          target: Math.max(profile.emergency_fund_target, 1),
          risk: "Low",
          note: profileSummary?.readiness ?? (gap > 0 ? `${formatCurrency(gap)} left to target` : "Target fully funded"),
        },
        {
          name: "Monthly investment capacity",
          value: profile.monthly_investment_capacity,
          target: Math.max(profile.monthly_investment_capacity * 2, profile.monthly_investment_capacity || 1),
          risk: profile.risk_profile,
          note: profile.notes ?? "Use this as the monthly SIP ceiling",
        },
        {
          name: "Savings goals",
          value: goals.reduce((total, goal) => total + goal.current_amount, 0),
          target: Math.max(goals.reduce((total, goal) => total + goal.target_amount, 0), 1),
          risk: goals.length > 2 ? "Medium" : "Balanced",
          note: goals.length > 0 ? `${goals.length} active goal${goals.length === 1 ? "" : "s"}` : "No savings goals yet",
        },
      ];
    }

    return sampleInvestments.map((item) => ({
      name: item.name,
      value: item.value,
      target: item.target,
      risk: item.risk,
    }));
  }, [goals, profile, profileSummary]);

  if (loading) return <LoadingSkeleton variant="cards" />;

  return (
    <div className="space-y-6">
      <CardHeader eyebrow="Wealth engine" title="Investment readiness" />
      {usingSampleData && (
        <ErrorState
          message="Showing demo investment data until live backend data is available."
          action={<Button onClick={loadInvestments} type="button" variant="secondary">Retry</Button>}
        />
      )}
      {cards.length === 0 ? (
        <EmptyState title="No investment profile yet" body="Create a profile to see fund progress and allocation guidance." />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((item) => {
            const progress = Math.round((item.value / item.target) * 100);
            return (
              <Card key={item.name}>
                <p className="text-sm font-bold text-slate-500">{item.risk} risk</p>
                <h2 className="mt-2 text-xl font-black">{item.name}</h2>
                <p className="mt-4 text-2xl font-black">{formatCurrency(item.value)}</p>
                <p className="text-sm text-slate-500">Target {formatCurrency(item.target)}</p>
                {item.note && <p className="mt-2 text-sm text-slate-500">{item.note}</p>}
                <progress className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" max={100} value={Math.min(progress, 100)} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
