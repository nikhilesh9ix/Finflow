import type {
  Budget,
  CopilotResponse,
  DashboardSummary,
  DebtStrategy,
  InvestmentProfile,
  SalaryPlan,
  Transaction,
  User,
} from "../types";

export const fallbackNotice =
  "Showing demo data — the backend is unavailable. Start the backend and refresh to see your live data.";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const demoUser: User = {
  id: 1,
  full_name: "Demo User",
  email: "demo@finflow.ai",
  monthly_income: 125000,
  currency: "INR",
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const demoDashboardSummary: DashboardSummary = {
  monthly_income: 125000,
  actual_income: 125000,
  monthly_spend: 87650,
  projected_savings: 37350,
  savings_rate: 29.9,
  category_spend: [
    { category: "Housing", amount: 32000 },
    { category: "Groceries", amount: 8700 },
    { category: "Dining", amount: 14000 },
    { category: "Transport", amount: 4200 },
    { category: "Entertainment", amount: 649 },
    { category: "Health", amount: 1800 },
    { category: "Shopping", amount: 11400 },
    { category: "EMI/Loan", amount: 14901 },
  ],
  budget_health: [
    { category: "Housing", spent: 32000, limit: 35000, status: "safe" },
    { category: "Dining", spent: 14000, limit: 10000, status: "over" },
    { category: "Entertainment", spent: 649, limit: 2000, status: "safe" },
    { category: "Groceries", spent: 8700, limit: 10000, status: "safe" },
  ],
  recent_transactions: [
    {
      id: 1,
      transaction_date: "2026-06-20",
      description: "Salary credit",
      merchant: "Employer",
      category: "Salary/Income",
      amount: 125000,
      transaction_type: "income",
      source: "demo",
    },
    {
      id: 2,
      transaction_date: "2026-06-18",
      description: "Apartment rent",
      merchant: "Landlord",
      category: "Housing",
      amount: -32000,
      transaction_type: "expense",
      source: "demo",
    },
    {
      id: 3,
      transaction_date: "2026-06-16",
      description: "Grocery run",
      merchant: "FreshMart",
      category: "Groceries",
      amount: -4350,
      transaction_type: "expense",
      source: "demo",
    },
    {
      id: 4,
      transaction_date: "2026-06-14",
      description: "Swiggy order",
      merchant: "Swiggy",
      category: "Dining",
      amount: -680,
      transaction_type: "expense",
      source: "demo",
    },
    {
      id: 5,
      transaction_date: "2026-06-12",
      description: "Home loan EMI",
      merchant: "HDFC Bank",
      category: "EMI/Loan",
      amount: -14901,
      transaction_type: "expense",
      source: "demo",
    },
  ],
};

// ─── Transactions ─────────────────────────────────────────────────────────────

export const demoTransactions: Transaction[] = demoDashboardSummary.recent_transactions;

// ─── Budgets ──────────────────────────────────────────────────────────────────

export const demoBudgets: Budget[] = [
  { id: 1, category: "Housing", monthly_limit: 35000, priority: "essential" },
  { id: 2, category: "Groceries", monthly_limit: 10000, priority: "essential" },
  { id: 3, category: "Dining", monthly_limit: 10000, priority: "watch" },
  { id: 4, category: "Entertainment", monthly_limit: 2000, priority: "normal" },
];

// ─── Salary plan ─────────────────────────────────────────────────────────────

export const demoSalaryPlan: SalaryPlan = {
  income: 125000,
  allocations: [
    { bucket: "Essentials", amount: 47500, note: "Rent, groceries, utilities, transport" },
    { bucket: "Debt EMIs", amount: 14901, note: "1 active debt account" },
    { bucket: "Investments", amount: 18750, note: "Risk profile: balanced" },
    { bucket: "Emergency fund", amount: 6250, note: "Build liquidity before lifestyle expansion" },
    { bucket: "Flexible", amount: 37599, note: "Dining, shopping, and discretionary spend" },
  ],
};

// ─── Debt ─────────────────────────────────────────────────────────────────────

export const demoDebtStrategy: DebtStrategy = {
  method: "avalanche",
  total_outstanding: 1902000,
  monthly_emi: 29901,
  priority: [
    {
      id: 1,
      lender: "ICICI Card",
      debt_type: "Credit Card",
      outstanding_amount: 42000,
      interest_rate: 36,
      emi_amount: 8000,
      due_day: 22,
    },
    {
      id: 2,
      lender: "HDFC Bank",
      debt_type: "Home Loan",
      outstanding_amount: 1860000,
      interest_rate: 8.6,
      emi_amount: 14901,
      due_day: 5,
    },
  ],
  insight:
    "Pay minimum EMIs on all accounts, then send extra money to the highest-interest balance first.",
};

// ─── Investments ──────────────────────────────────────────────────────────────

export const demoInvestmentProfile: InvestmentProfile = {
  id: 1,
  risk_profile: "balanced",
  monthly_investment_capacity: 18750,
  emergency_fund_target: 375000,
  emergency_fund_current: 120000,
  emergency_gap: 255000,
  readiness: "Emergency fund still needs funding before raising risk.",
  notes: null,
};

// ─── Copilot ─────────────────────────────────────────────────────────────────

export const demoCopilotResponse: CopilotResponse = {
  answer:
    "Dining is 40% over budget this month. Consider reducing takeout by one order per week to recover ₹4,000.",
  data_status: "ok",
};
