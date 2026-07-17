import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Search, Upload } from "lucide-react";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Card, CardHeader } from "../components/Card";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/State";
import { Table, Td, Th } from "../components/Table";
import { useToast } from "../components/Toast";
import { api, type CsvUploadResult, type Transaction } from "../services/api";
import { sampleTransactions } from "../store/sampleData";
import { formatCurrency } from "../utils/format";
import { cn } from "../utils/cn";

const categoryTone = (category: string) => {
  if (category === "Salary/Income") return "success";
  if (category === "EMI/Loan") return "danger";
  if (category === "Entertainment") return "info";
  if (category === "Food") return "warning";
  if (category === "Health") return "info";
  return "neutral";
};

const transactionTypeLabel = (item: Transaction) => {
  if (item.transaction_type === "transfer") return "Transfer";
  if (item.transaction_type === "income" || item.amount > 0) return "Credit";
  return "Debit";
};

export function TransactionsPage() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usingSampleData, setUsingSampleData] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const loadTransactions = useCallback(() => {
    setLoading(true);
    api.getTransactions()
      .then((rows) => {
        if (rows.length === 0) {
          setTransactions(sampleTransactions);
          setUsingSampleData(true);
          setError("");
        } else {
          setTransactions(rows);
          setUsingSampleData(false);
          setError("");
        }
      })
      .catch((err) => {
        setTransactions(sampleTransactions);
        setUsingSampleData(true);
        setError(err instanceof Error ? err.message : "Unable to load transactions");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showToast("Please upload a CSV file.", "error");
      return;
    }

    setUploading(true);
    try {
      const result: CsvUploadResult = await api.uploadTransactions(file);
      if (result.imported > 0) {
        showToast(`Imported ${result.imported} transaction${result.imported === 1 ? "" : "s"} successfully.`);
      }
      if (result.skipped > 0) {
        showToast(`${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped. ${result.errors[0]?.error ?? ""}`, "error");
      }
      if (result.imported === 0 && result.skipped === 0) {
        showToast("No rows found in CSV.", "error");
      }
      loadTransactions();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(transactions.map((item) => item.category))).sort()],
    [transactions],
  );

  const filtered = useMemo(() => transactions.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const searchable = `${item.description} ${item.merchant ?? ""} ${item.category}`.toLowerCase();
    const matchesQuery = searchable.includes(query.toLowerCase());
    const matchesFrom = !dateFrom || item.transaction_date >= dateFrom;
    const matchesTo = !dateTo || item.transaction_date <= dateTo;
    return matchesCategory && matchesQuery && matchesFrom && matchesTo;
  }), [transactions, category, query, dateFrom, dateTo]);

  if (loading) return <LoadingSkeleton variant="table" />;

  return (
    <div className="space-y-6">
      {usingSampleData && (
        <ErrorState
          message={error || "Showing demo transactions until live backend data is available."}
          action={<Button onClick={loadTransactions} type="button" variant="secondary">Retry</Button>}
        />
      )}

      <Card>
        <CardHeader eyebrow="CSV import" title="Upload and categorize transactions" />
        <div
          className={cn(
            "mt-2 rounded-xl border-2 border-dashed p-8 text-center transition",
            dragActive ? "border-teal-500 bg-teal-50/80 dark:bg-teal-500/10" : "border-slate-200 dark:border-slate-700",
            uploading && "pointer-events-none opacity-60",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            void handleUpload(event.dataTransfer.files?.[0]);
          }}
        >
          <FileSpreadsheet className="mx-auto h-10 w-10 text-teal-600 dark:text-teal-300" />
          <p className="mt-4 text-base font-bold text-slate-950 dark:text-white">Drag and drop your CSV here</p>
          <p className="mt-1 text-sm text-slate-500">Required columns: date, description, amount. Optional: type (debit/credit), merchant, category.</p>
          <input
            accept=".csv"
            className="sr-only"
            onChange={(event) => void handleUpload(event.target.files?.[0])}
            ref={fileInputRef}
            title="Upload CSV file"
            type="file"
          />
          <button
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-soft shadow-teal-900/20 transition hover:bg-teal-700"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Browse CSV file"}
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Transactions"
          action={usingSampleData ? <Badge tone="warning">Sample data</Badge> : undefined}
        />
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_160px_160px]">
          <label className="relative md:col-span-2 xl:col-span-1">
            <span className="sr-only">Search transactions</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search description or merchant"
              value={query}
            />
          </label>
          <select
            title="Filter by category"
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            {categories.map((item) => (
              <option key={item} value={item}>{item === "all" ? "All categories" : item}</option>
            ))}
          </select>
          <input
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            onChange={(event) => setDateFrom(event.target.value)}
            type="date"
            value={dateFrom}
            title="Filter from date"
            aria-label="Filter from date"
          />
          <input
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            onChange={(event) => setDateTo(event.target.value)}
            type="date"
            value={dateTo}
            title="Filter to date"
            aria-label="Filter to date"
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No matching transactions" body="Clear filters or upload a CSV file to populate this table." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th>Category</Th>
                  <Th>Type</Th>
                  <Th align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <Td>{item.transaction_date}</Td>
                    <Td>
                      <p className="font-semibold text-slate-950 dark:text-white">{item.description}</p>
                      {item.merchant && <p className="text-xs text-slate-500">{item.merchant}</p>}
                    </Td>
                    <Td><Badge tone={categoryTone(item.category)}>{item.category}</Badge></Td>
                    <Td>{transactionTypeLabel(item)}</Td>
                    <Td align="right">
                      <span className={item.amount < 0 ? "font-bold text-rose-600 dark:text-rose-300" : "font-bold text-emerald-600 dark:text-emerald-300"}>
                        {formatCurrency(item.amount)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
