/**
 * TanStack Query wrappers for all FinFlow API calls.
 *
 * Each hook returns the standard useQuery result.
 * Components import from here instead of calling apiFetch directly.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./api";
import type {
  Budget,
  BudgetAlert,
  DashboardSummary,
  DebtStrategy,
  InvestmentProfile,
  SalaryPlan,
  Transaction,
} from "../types";

// ── Generic page envelope ──────────────────────────────────────────────────────

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard", "summary"],
    queryFn: () => apiFetch<DashboardSummary>("/dashboard/summary"),
  });
}

// ── Transactions ───────────────────────────────────────────────────────────────

export function useTransactions(limit = 50, offset = 0) {
  return useQuery<Page<Transaction>>({
    queryKey: ["transactions", limit, offset],
    queryFn: () =>
      apiFetch<Page<Transaction>>(`/transactions?limit=${limit}&offset=${offset}`),
    // Keep the current page on screen while the next one loads; without this every
    // Prev/Next click swapped the whole page for a loading skeleton.
    placeholderData: keepPreviousData,
  });
}

// ── Budgets ────────────────────────────────────────────────────────────────────

export function useBudgets(limit = 100, offset = 0) {
  return useQuery<Page<Budget>>({
    queryKey: ["budgets", limit, offset],
    queryFn: () => apiFetch<Page<Budget>>(`/budgets?limit=${limit}&offset=${offset}`),
  });
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export function useMonthlySpendTrend() {
  return useQuery<Array<{ month: string; spend: number }>>({
    queryKey: ["analytics", "monthly-spend"],
    queryFn: () =>
      apiFetch<Array<{ month: string; spend: number }>>("/analytics/monthly-spend"),
  });
}

export function useCategoryBreakdown() {
  return useQuery<Array<{ category: string; amount: number }>>({
    queryKey: ["analytics", "category-breakdown"],
    queryFn: () =>
      apiFetch<Array<{ category: string; amount: number }>>("/analytics/category-breakdown"),
  });
}

export function useIncomeVsExpense() {
  return useQuery<Array<{ month: string; income: number; expense: number }>>({
    queryKey: ["analytics", "income-vs-expense"],
    queryFn: () =>
      apiFetch<Array<{ month: string; income: number; expense: number }>>(
        "/analytics/income-vs-expense",
      ),
  });
}

export function useBudgetAlerts() {
  return useQuery<BudgetAlert[]>({
    queryKey: ["budgets", "alerts"],
    queryFn: () => apiFetch<BudgetAlert[]>("/budgets/alerts"),
  });
}

// ── Salary / Debt / Investment ─────────────────────────────────────────────────

export function useSalaryPlan() {
  return useQuery<SalaryPlan>({
    queryKey: ["salary-plan"],
    queryFn: () => apiFetch<SalaryPlan>("/salary-plan"),
  });
}

export function useDebtStrategy() {
  return useQuery<DebtStrategy>({
    queryKey: ["debt-strategy"],
    queryFn: () => apiFetch<DebtStrategy>("/debt-accounts/strategy"),
  });
}

export function useInvestmentProfile() {
  return useQuery<InvestmentProfile>({
    queryKey: ["investment-profile"],
    queryFn: () => apiFetch<InvestmentProfile>("/investment-profile"),
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────────
// Each invalidates every derived view, since budgets and debts feed the salary
// plan, dashboard summary, and copilot answers.

function useInvalidateFinance() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      queryClient.invalidateQueries({ queryKey: ["debt-strategy"] }),
      queryClient.invalidateQueries({ queryKey: ["salary-plan"] }),
      queryClient.invalidateQueries({ queryKey: ["investment-profile"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["analytics"] }),
    ]);
}

export interface BudgetInput {
  category: string;
  monthly_limit: number;
  priority: string;
}

export function useCreateBudget() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (input: BudgetInput) =>
      apiFetch<Budget>("/budgets", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/budgets/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export interface DebtInput {
  lender: string;
  debt_type: string;
  outstanding_amount: number;
  interest_rate: number;
  emi_amount: number;
  due_day: number;
}

export function useCreateDebt() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (input: DebtInput) =>
      apiFetch<unknown>("/debt-accounts", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: invalidate,
  });
}

export function useDeleteDebt() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/debt-accounts/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });
}

export interface InvestmentProfileInput {
  risk_profile: string;
  monthly_investment_capacity: number;
  emergency_fund_target: number;
  emergency_fund_current: number;
}

export function useSaveInvestmentProfile() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (input: InvestmentProfileInput) =>
      // No `notes` in the body: the form has no notes field, and sending null
      // erased notes the user had saved.
      apiFetch<InvestmentProfile>("/investment-profile", {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });
}
