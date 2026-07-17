import type { Budget, CopilotResponse, DashboardSummary, DebtAudit, InvestmentRecommendation, SalaryPlan, Transaction, User } from "../types";

export const fallbackNotice = "The demo dataset is being shown because the backend is unavailable. Start the backend and refresh to reconnect to live data.";

export const demoUser: User = {
  id: 1,
  name: "Nikhil Demo",
  email: "demo@finflow.ai",
  monthly_income: 125000,
  risk_profile: "balanced",
  currency: "INR",
};

export const demoDashboardSummary: DashboardSummary = {
  monthly_income: 125000,
  actual_income: 125000,
  monthly_spend: 113000,
  projected_savings: 12000,
  savings_rate: 9.6,
  category_spend: [
    { category: "Housing", amount: 32000 },
    { category: "Groceries", amount: 8700 },
    { category: "Dining", amount: 14000 },
    { category: "Transport", amount: 4200 },
    { category: "Subscriptions", amount: 649 },
  ],
  budget_health: [
    { category: "Housing", spent: 32000, limit: 35000, status: "safe" },
    { category: "Dining", spent: 14000, limit: 10000, status: "over" },
    { category: "Subscriptions", spent: 649, limit: 2000, status: "safe" },
  ],
  recent_transactions: [],
};

export const demoTransactions: Transaction[] = [
  {
    id: 1,
    posted_at: "2026-06-20",
    description: "Salary credit",
    merchant: "Employer",
    category: "Income",
    amount: 125000,
    transaction_type: "income",
    source: "demo",
  },
  {
    id: 2,
    posted_at: "2026-06-18",
    description: "Apartment rent",
    merchant: "Landlord",
    category: "Housing",
    amount: -32000,
    transaction_type: "expense",
    source: "demo",
  },
  {
    id: 3,
    posted_at: "2026-06-16",
    description: "Grocery supermarket",
    merchant: "FreshMart",
    category: "Groceries",
    amount: -8700,
    transaction_type: "expense",
    source: "demo",
  },
];

export const demoBudgets: Budget[] = [
  { id: 1, category: "Housing", monthly_limit: 35000, priority: "essential", spent: 32000 },
  { id: 2, category: "Groceries", monthly_limit: 14000, priority: "essential", spent: 8700 },
  { id: 3, category: "Dining", monthly_limit: 10000, priority: "watch", spent: 14000 },
];

export const demoSalaryPlan: SalaryPlan = {
  income: 125000,
  monthly_fixed_costs: 54000,
  debt_load: 29000,
  debt_to_income_ratio: 0.232,
  strategy_mode: "balanced",
  warnings: ["Debt pressure is moderate; keep discretionary spends under control."],
  allocations: [
    { bucket: "Needs", percentage: 38, amount: 47500, rationale: "Covers rent, groceries, and utilities." },
    { bucket: "Debt", percentage: 23, amount: 28750, rationale: "Keeps EMI and card balances under control." },
    { bucket: "Savings", percentage: 20, amount: 25000, rationale: "Builds emergency buffer and near-term goals." },
    { bucket: "Lifestyle", percentage: 19, amount: 23750, rationale: "Keeps discretionary spending sustainable." },
  ],
  reasoning: ["Your fixed obligations take a manageable share of income.", "Saving first keeps the plan resilient even when spending spikes."],
};

export const demoDebtAudit: DebtAudit = {
  debt_to_income_ratio: 0.24,
  monthly_debt_payment: 29000,
  monthly_repayment_budget: 32000,
  avalanche_order: [
    { rank: 1, lender: "ICICI Card", debt_type: "Credit Card", outstanding_amount: 42000, interest_rate: 36, emi_amount: 8000, due_day: 22, rationale: "Highest cost debt should be cleared first." },
    { rank: 2, lender: "HDFC Bank", debt_type: "Home Loan", outstanding_amount: 1860000, interest_rate: 8.6, emi_amount: 21000, due_day: 5, rationale: "Lower interest but large balance; keep payments steady." },
  ],
  debt_free_months: 18,
  projected_payoff_date: "2027-12",
  warnings: ["High-interest credit card debt is crowding out savings."],
  wealth_leaks: [
    { title: "Dining overspend", severity: "medium", evidence: "Dining is 40% above the planned budget.", recommendation: "Reduce takeout orders and meal subscriptions by one per week." },
  ],
  projection: [
    { month: 1, remaining_debt: 1900000 },
    { month: 3, remaining_debt: 1840000 },
    { month: 6, remaining_debt: 1760000 },
    { month: 12, remaining_debt: 1580000 },
  ],
};

export const demoInvestmentRecommendation: InvestmentRecommendation = {
  profile_mode: "balanced",
  risk_tolerance: "balanced",
  disclaimer: "Educational guidance only. This is not personalized financial advice.",
  buckets: [
    { category: "Emergency fund", percentage: 32, amount: 40000, rationale: "A landing pad for unexpected expenses." },
    { category: "Liquid fund", percentage: 25, amount: 31250, rationale: "Short-term flexibility with low volatility." },
    { category: "Index fund SIP", percentage: 28, amount: 35000, rationale: "Broad market exposure for long-term growth." },
    { category: "Gold ETF", percentage: 15, amount: 18750, rationale: "Diversification and inflation hedge." },
  ],
  reasoning: ["This mix keeps liquidity high while still allowing growth."],
  projection_notes: ["Revisit the split every quarter if your income or debt load changes."],
};

export const demoCopilotResponse: CopilotResponse = {
  answer: "Your budget is healthy but dining and subscriptions are the main leakage points. Consider trimming one recurring subscription and cutting takeout by 30%.",
  confidence: "high",
  provider: "demo",
  facts: [
    { label: "Spend this month", value: "₹1.13L", detail: "Your current spend is above the planned savings target." },
    { label: "Debt pressure", value: "23%", detail: "Debt load is manageable but should stay controlled." },
  ],
  starter_prompts: ["What should I cut this month?", "Can I increase my SIP?"],
  history_id: 1,
};
