import { Upload } from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { useToast } from "../components/ToastProvider";
import { apiFetch } from "../lib/api";
import { demoTransactions, fallbackNotice } from "../lib/demoData";
import { formatCurrency } from "../lib/format";
import type { Transaction } from "../types";

function getCategoryBadge(category?: string) {
  if (!category) return null;
  const clean = category.toLowerCase().trim();
  if (clean.includes("food") || clean.includes("dining")) return <span className="badge-warning">Food & Dining</span>;
  if (clean.includes("salary") || clean.includes("income")) return <span className="badge-success">Income</span>;
  if (clean.includes("rent") || clean.includes("bills") || clean.includes("utilities") || clean.includes("housing")) return <span className="badge-info">Bills & Housing</span>;
  if (clean.includes("invest") || clean.includes("savings") || clean.includes("equity")) return <span className="badge-success">Investment</span>;
  if (clean.includes("emi") || clean.includes("debt") || clean.includes("loan") || clean.includes("card")) return <span className="badge-danger">Debt payoff</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100/80 px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200/50 dark:bg-slate-800/80 dark:text-slate-350 dark:ring-slate-700/50 capitalize">
      {category}
    </span>
  );
}

export function TransactionsPage() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<Transaction[]>("/transactions");
      setTransactions(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load transactions";
      setError(message);
      setTransactions(demoTransactions);
      showToast(fallbackNotice, "info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [showToast]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    try {
      setError(null);
      setMessage("");
      const result = await apiFetch<{ created: number }>('/transactions/upload-csv', { method: 'POST', body: formData });
      setMessage(`${result.created} transactions imported`);
      showToast(`Imported ${result.created} transactions`, 'success');
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to import CSV';
      setError(message);
      showToast(message, 'error');
    } finally {
      event.target.value = "";
    }
  };

  if (loading && !transactions.length) return <LoadingSkeleton variant="table" />;

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="hero-panel flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker">Money movement</p>
          <h2 className="section-title">Transactions</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-650 sm:text-base dark:text-slate-350 font-medium">Review every movement with a clean ledger view and import transactions without leaving the workspace.</p>
        </div>
        <label className="secondary-button cursor-pointer">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Upload CSV
          <input className="sr-only" type="file" accept=".csv" onChange={handleUpload} />
        </label>
      </section>
      {message && <p className="alert-success">{message}</p>}
      {error ? <ErrorState title="Live transactions unavailable" body={error} /> : null}
      {transactions.length === 0 ? (
        <EmptyState title="No transactions yet" body="Upload a CSV with date, description, merchant, amount, and optional category to start your ledger." />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Description</th><th>Category</th><th>Source</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const isNegative = transaction.amount < 0;
                const formattedAmount = formatCurrency(Math.abs(transaction.amount));
                return (
                  <tr key={transaction.id}>
                    <td className="text-xs font-semibold text-slate-400 dark:text-slate-500">{transaction.posted_at}</td>
                    <td className="font-bold text-slate-850 dark:text-slate-100">{transaction.description}</td>
                    <td>{getCategoryBadge(transaction.category)}</td>
                    <td className="text-sm text-slate-500">{transaction.source}</td>
                    <td className={`text-right font-bold tracking-tight ${isNegative ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-450"}`}>
                      {isNegative ? `-${formattedAmount}` : `+${formattedAmount}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
