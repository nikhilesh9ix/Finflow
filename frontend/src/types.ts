// ─── Auth ────────────────────────────────────────────────────────────────────

export type User = {
  id: number;
  full_name: string;
  email: string;
  monthly_income: number;
  currency: string;
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export type TransactionType = "income" | "expense" | "transfer";

export type Transaction = {
  id: number;
  transaction_date: string; // ISO date string: "2026-06-20"
  description: string;
  merchant: string | null;
  category: string;
  amount: number;
  transaction_type: TransactionType;
  source: string;
};

// ─── Budgets ──────────────────────────────────────────────────────────────────

export type BudgetStatus = "safe" | "warning" | "over" | "overspent";

export type Budget = {
  id: number;
  category: string;
  monthly_limit: number;
  priority: string;
};

export type BudgetAlert = {
  budget_id: number;
  category: string;
  monthly_limit: number;
  spent: number;
  remaining: number;
  usage_percent: number;
  status: BudgetStatus;
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type CategorySpend = {
  category: string;
  amount: number;
};

export type BudgetHealth = {
  category: string;
  spent: number;
  limit: number;
  status: "safe" | "warning" | "over";
};

export type DashboardSummary = {
  monthly_income: number;     // user's configured salary
  actual_income: number;      // income transactions received this month
  monthly_spend: number;      // expense transactions this month
  projected_savings: number;  // actual_income - monthly_spend
  savings_rate: number;       // percentage
  category_spend: CategorySpend[];
  budget_health: BudgetHealth[];
  recent_transactions: Transaction[];
};

// ─── Salary plan ─────────────────────────────────────────────────────────────

export type SalaryAllocation = {
  bucket: string;
  amount: number;
  note: string;
};

export type SalaryPlan = {
  income: number;
  allocations: SalaryAllocation[];
};

// ─── Debt ─────────────────────────────────────────────────────────────────────

export type DebtAccount = {
  id: number;
  lender: string;
  debt_type: string;
  outstanding_amount: number;
  interest_rate: number;
  emi_amount: number;
  due_day: number;
};

export type DebtStrategy = {
  method: string;
  total_outstanding: number;
  monthly_emi: number;
  priority: DebtAccount[];
  insight: string;
};

// ─── Investments ──────────────────────────────────────────────────────────────

export type InvestmentProfile = {
  id: number;
  risk_profile: string;
  monthly_investment_capacity: number;
  emergency_fund_target: number;
  emergency_fund_current: number;
  emergency_gap: number;
  readiness: string;
  notes: string | null;
};

// ─── Copilot ─────────────────────────────────────────────────────────────────

export type CopilotResponse = {
  answer: string;
  data_status: "ok" | "missing_question" | "missing_transactions";
};

// ─── Savings goals ───────────────────────────────────────────────────────────

export type SavingsGoal = {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null; // ISO date string
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export type MonthlySpend = {
  month: string; // "YYYY-MM"
  spend: number;
};

export type IncomeVsExpense = {
  month: string;
  income: number;
  expense: number;
};

export type TopMerchant = {
  merchant: string;
  amount: number;
};

export type RecurringTransaction = {
  merchant: string;
  category: string;
  average_amount: number;
  count: number;
};
