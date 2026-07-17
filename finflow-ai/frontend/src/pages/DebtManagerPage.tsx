import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Card, CardHeader } from "../components/Card";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/State";
import { api, type DebtAccount, type DebtStrategy } from "../services/api";
import { debts as sampleDebts } from "../store/sampleData";
import { formatCurrency } from "../utils/format";

function seedDebtAccounts(): DebtAccount[] {
  return sampleDebts.map((debt, index) => ({
    id: index + 1,
    lender: debt.lender,
    debt_type: debt.type,
    outstanding_amount: debt.balance,
    interest_rate: debt.rate,
    emi_amount: debt.emi,
    due_day: debt.due,
  }));
}

export function DebtManagerPage() {
  const [debts, setDebts] = useState<DebtAccount[]>([]);
  const [strategy, setStrategy] = useState<DebtStrategy | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDebts = useCallback(() => {
    setLoading(true);
    api.getDebtStrategy()
      .then((data) => {
        if (data.priority.length === 0) {
          setDebts(seedDebtAccounts());
          setStrategy(null);
          setUsingSampleData(true);
          return;
        }
        setDebts(data.priority);
        setStrategy(data);
        setUsingSampleData(false);
      })
      .catch(() => {
        setDebts(seedDebtAccounts());
        setStrategy(null);
        setUsingSampleData(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  if (loading) return <LoadingSkeleton variant="cards" />;

  return (
    <div className="space-y-6">
      <CardHeader eyebrow="Debt control" title="Avalanche payoff plan" />
      {strategy && (
        <Card>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">Total outstanding</p>
              <p className="text-2xl font-black">{formatCurrency(strategy.total_outstanding)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Monthly EMI</p>
              <p className="text-2xl font-black">{formatCurrency(strategy.monthly_emi)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Method</p>
              <p className="text-2xl font-black capitalize">{strategy.method}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{strategy.insight}</p>
        </Card>
      )}
      {usingSampleData && (
        <ErrorState
          message="Showing demo debt accounts until live backend data is available."
          action={<Button onClick={loadDebts} type="button" variant="secondary">Retry</Button>}
        />
      )}
      {debts.length === 0 ? (
        <EmptyState title="No debts yet" body="Add debt accounts to compare balances and payoff order." />
      ) : (
      <div className="grid gap-4 lg:grid-cols-2">
        {debts.map((debt) => (
          <Card key={debt.lender}>
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-black">{debt.lender}</h2><p className="text-sm text-slate-500">{debt.debt_type}</p></div>
              <Badge tone={debt.interest_rate > 20 ? "danger" : "info"}>{debt.interest_rate}% APR</Badge>
            </div>
            <p className="mt-6 text-3xl font-black">{formatCurrency(debt.outstanding_amount)}</p>
            <p className="mt-2 text-sm text-slate-500">EMI {formatCurrency(debt.emi_amount)} - due day {debt.due_day}</p>
          </Card>
        ))}
      </div>
      )}
    </div>
  );
}
