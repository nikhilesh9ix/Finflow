import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/State";
import { api, type SalaryPlan } from "../services/api";
import { salaryBuckets as sampleSalaryBuckets } from "../store/sampleData";
import { formatCurrency } from "../utils/format";

type SalaryBucket = {
  bucket: string;
  amount: number;
  note: string;
};

export function SalaryPlannerPage() {
  const [plan, setPlan] = useState<SalaryPlan | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPlanner = useCallback(() => {
    setLoading(true);
    api.getSalaryPlan()
      .then((salaryPlan) => {
        setPlan(salaryPlan);
        setUsingSampleData(salaryPlan.allocations.length === 0);
      })
      .catch(() => {
        setPlan(null);
        setUsingSampleData(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPlanner();
  }, [loadPlanner]);

  const buckets = useMemo<SalaryBucket[]>(() => {
    return plan?.allocations ?? sampleSalaryBuckets;
  }, [plan]);

  if (loading) return <LoadingSkeleton variant="cards" />;

  return (
    <div className="space-y-6">
      <CardHeader eyebrow="Salary orchestration" title="Route every rupee before it drifts" />
      {usingSampleData && (
        <ErrorState
          message="Showing demo salary allocation until live backend data is available."
          action={<Button onClick={loadPlanner} type="button" variant="secondary">Retry</Button>}
        />
      )}
      {buckets.length === 0 ? (
        <EmptyState title="No salary plan yet" body="Add income, debts, and an investment profile to calculate allocations." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {buckets.map((item) => (
            <Card key={item.bucket}>
              <h2 className="text-base font-black">{item.bucket}</h2>
              <p className="mt-3 text-2xl font-black text-teal-700 dark:text-teal-300">{formatCurrency(item.amount)}</p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{item.note}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
