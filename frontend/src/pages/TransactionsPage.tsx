import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/StatePanel";
import { useToast } from "../components/ToastProvider";
import { apiFetch, isAuthError, isBackendUnreachable } from "../lib/api";
import { formatCurrency } from "../lib/format";
import { useTransactions } from "../lib/queries";
import { useAuthStore } from "../store/auth";
import type { Transaction } from "../types";

const PAGE_SIZE = 50;

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null;
  const c = category.toLowerCase();
  if (c.includes("food") || c.includes("dining"))
    return <span className="badge-warning">Food</span>;
  if (c.includes("salary") || c.includes("income"))
    return <span className="badge-success">Income</span>;
  if (c.includes("rent") || c.includes("utilities") || c.includes("housing"))
    return <span className="badge-info">Housing</span>;
  if (c.includes("invest") || c.includes("savings"))
    return <span className="badge-success">Investment</span>;
  if (c.includes("emi") || c.includes("debt") || c.includes("loan"))
    return <span className="badge-danger">Debt</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100/80 px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200/50 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700/50 capitalize">
      {category}
    </span>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isNegative = Number(transaction.amount) < 0;
  const formatted = formatCurrency(Math.abs(Number(transaction.amount)));
  return (
    <tr>
      <td className="text-xs font-semibold whitespace-nowrap text-slate-500 dark:text-slate-400 tabular-nums">
        {transaction.transaction_date}
      </td>
      <td className="font-bold text-slate-800 dark:text-slate-100">{transaction.description}</td>
      <td className="text-sm text-slate-500 dark:text-slate-400">{transaction.merchant ?? "—"}</td>
      <td>
        <CategoryBadge category={transaction.category} />
      </td>
      <td className="text-sm text-slate-500 dark:text-slate-400">{transaction.source}</td>
      <td
        className={`text-right font-bold tracking-tight tabular-nums ${
          isNegative
            ? "text-rose-700 dark:text-rose-400"
            : "text-emerald-700 dark:text-emerald-400"
        }`}
      >
        {isNegative ? `-${formatted}` : `+${formatted}`}
      </td>
    </tr>
  );
}

export function TransactionsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const loadMe = useAuthStore((state) => state.loadMe);

  const [page, setPage] = useState(0);
  const [uploadMessage, setUploadMessage] = useState<{ kind: "success" | "error"; text: string; details: string[] } | null>(null);

  const offset = page * PAGE_SIZE;
  const { data, isLoading, isError, error } = useTransactions(PAGE_SIZE, offset);

  const transactions: Transaction[] = data?.items ?? [];
  const total = data?.total ?? transactions.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploadMessage(null);
      const result = await apiFetch<{ imported: number; skipped: number; errors: { row: number; error: string }[] }>(
        "/transactions/upload",
        { method: "POST", body: formData },
      );
      // The API answers 200 even when nothing could be read (e.g. missing columns),
      // so an upload that imported nothing was reported as a success.
      const details = (result.errors ?? []).slice(0, 5).map((e) => (e.row ? `Row ${e.row}: ${e.error}` : e.error));
      if (result.imported === 0 && result.skipped > 0) {
        setUploadMessage({ kind: "error", text: `Nothing imported — ${result.skipped} row${result.skipped === 1 ? "" : "s"} could not be used.`, details });
        showToast("No transactions were imported", "error");
        return;
      }
      setUploadMessage({
        kind: "success",
        text: `${result.imported} transactions imported${result.skipped > 0 ? `, ${result.skipped} skipped` : ""}`,
        details,
      });
      showToast(`Imported ${result.imported} transactions`, "success");
      // An import can change monthly income (derived from salary credits), which
      // feeds the salary plan, budgets, and emergency-fund target — refresh all of
      // them, plus the signed-in user so Settings shows the new income.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics"] }),
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
        queryClient.invalidateQueries({ queryKey: ["salary-plan"] }),
        queryClient.invalidateQueries({ queryKey: ["investment-profile"] }),
        loadMe(),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to import CSV";
      showToast(msg, "error");
    } finally {
      event.target.value = "";
    }
  };

  if (isLoading && !data) return <LoadingSkeleton variant="table" />;

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="hero-panel flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker">Money movement</p>
          <h2 className="section-title">Transactions</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300 font-medium">
            Review every movement with a clean ledger view. Import from any bank CSV.
          </p>
        </div>
        <label className="secondary-button cursor-pointer">
          <Upload className="h-4 w-4" aria-hidden="true" />
          Upload CSV
          <input className="sr-only" type="file" accept=".csv" onChange={handleUpload} />
        </label>
      </section>

      {uploadMessage && (
        <div className={uploadMessage.kind === "error" ? "alert-error" : "alert-success"} role="status">
          <p className="font-semibold">{uploadMessage.text}</p>
          {uploadMessage.details.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
              {uploadMessage.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {isError && !isAuthError(error) && (
        <ErrorState
          title={isBackendUnreachable(error) ? "Live transactions unavailable" : "Could not load transactions"}
          body={error instanceof Error ? error.message : "API error"}
        />
      )}

      {transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          body="Upload a CSV with date, description, merchant, amount, and optional category."
        />
      ) : (
        <div className="panel">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800/80 mt-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of{" "}
                <span className="font-semibold tabular-nums">{total}</span>
              </p>
              <div className="flex gap-2">
                <button
                  className="secondary-button py-1.5 px-3 text-sm disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <button
                  className="secondary-button py-1.5 px-3 text-sm disabled:opacity-40"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
