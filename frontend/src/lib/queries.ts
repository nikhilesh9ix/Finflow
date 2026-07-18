/**
 * TanStack Query wrappers for all FinFlow API calls.
 *
 * Each hook returns the standard useQuery result.
 * Components import from here instead of calling apiFetch directly.
 */

import { useQuery } from "@tanstack/react-query";
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
