export type User = {
  id: number;
  name: string;
  email: string;
  monthly_income: number;
  risk_profile: string;
  currency: string;
};

export type Transaction = {
  id: number;
  posted_at: string;
  description: string;
  merchant: string;
  category: string;
  amount: number;
  transaction_type: "income" | "expense";
  source: string;
};

export type Budget = {
  id: number;
  category: string;
  monthly_limit: number;
  priority: string;
  spent: number;
};

export type Debt = {
  id: number;
  lender: string;
  debt_type: string;
  outstanding_amount: number;
  interest_rate: number;
  emi_amount: number;
  due_day: number;
};

export type DashboardSummary = {
  monthly_income: number;
  actual_income: number;
  monthly_spend: number;
  projected_savings: number;
  savings_rate: number;
  category_spend: { category: string; amount: number }[];
  budget_health: { category: string; spent: number; limit: number; status: string }[];
  recent_transactions: Transaction[];
};

export type SalaryAllocation = {
  bucket: string;
  percentage: number;
  amount: number;
  rationale: string;
};

export type SalaryPlan = {
  income: number;
  monthly_fixed_costs: number;
  debt_load: number;
  debt_to_income_ratio: number;
  strategy_mode: string;
  warnings: string[];
  allocations: SalaryAllocation[];
  reasoning: string[];
};

export type DebtRecommendation = {
  rank: number;
  lender: string;
  debt_type: string;
  outstanding_amount: number;
  interest_rate: number;
  emi_amount: number;
  due_day: number;
  rationale: string;
};

export type DebtLeak = {
  title: string;
  severity: string;
  evidence: string;
  recommendation: string;
};

export type DebtAudit = {
  debt_to_income_ratio: number;
  monthly_debt_payment: number;
  monthly_repayment_budget: number;
  avalanche_order: DebtRecommendation[];
  debt_free_months: number;
  projected_payoff_date: string;
  warnings: string[];
  wealth_leaks: DebtLeak[];
  projection: { month: number; remaining_debt: number }[];
};

export type InvestmentBucket = {
  category: string;
  percentage: number;
  amount: number;
  rationale: string;
};

export type InvestmentRecommendation = {
  profile_mode: string;
  risk_tolerance: string;
  disclaimer: string;
  buckets: InvestmentBucket[];
  reasoning: string[];
  projection_notes: string[];
};

export type CopilotFact = {
  label: string;
  value: string;
  detail: string;
};

export type CopilotResponse = {
  answer: string;
  confidence: string;
  provider: string;
  facts: CopilotFact[];
  starter_prompts: string[];
  history_id: number | null;
};
