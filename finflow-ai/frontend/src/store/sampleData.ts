export const sampleMonthlyTrend = [
  { month: "2026-01", spend: 86500 },
  { month: "2026-02", spend: 91200 },
  { month: "2026-03", spend: 99800 },
  { month: "2026-04", spend: 90200 },
  { month: "2026-05", spend: 103600 },
  { month: "2026-06", spend: 98549 },
];

export const sampleCurrentMonth = {
  month: "2026-06",
  income: 125000,
  expense: 98549,
  net: 26451,
};

export const sampleCategoryBreakdown = [
  { category: "Bills", amount: 32000 },
  { category: "EMI/Loan", amount: 21000 },
  { category: "Other", amount: 18000 },
  { category: "Food", amount: 11000 },
  { category: "Transport", amount: 6200 },
];

export const sampleTransactions = [
  { id: 1, transaction_date: "2026-06-18", description: "Mutual fund SIP", merchant: "Zerodha Coin", category: "Other", amount: -18000, transaction_type: "expense" as const, source: "sample" },
  { id: 2, transaction_date: "2026-06-16", description: "Grocery run", merchant: "FreshMart", category: "Food", amount: -2800, transaction_type: "expense" as const, source: "sample" },
  { id: 3, transaction_date: "2026-06-12", description: "Home loan EMI", merchant: "HDFC Bank", category: "EMI/Loan", amount: -21000, transaction_type: "expense" as const, source: "sample" },
  { id: 4, transaction_date: "2026-06-08", description: "Salary credit", merchant: "Employer", category: "Salary/Income", amount: 125000, transaction_type: "income" as const, source: "sample" },
  { id: 5, transaction_date: "2026-06-05", description: "Dinner order", merchant: "Zomato", category: "Food", amount: -2400, transaction_type: "expense" as const, source: "sample" },
];

export const sampleBudgetAlerts = [
  { budget_id: 1, category: "Bills", monthly_limit: 35000, spent: 32000, remaining: 3000, usage_percent: 91.4, status: "warning" as const },
  { budget_id: 2, category: "Food", monthly_limit: 14000, spent: 11400, remaining: 2600, usage_percent: 81.4, status: "warning" as const },
  { budget_id: 3, category: "Entertainment", monthly_limit: 9000, spent: 649, remaining: 8351, usage_percent: 7.2, status: "safe" as const },
];

export const budgetCategories = [
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Health",
  "Entertainment",
  "EMI/Loan",
  "Salary/Income",
  "Other",
];

export const dashboardMetrics = [
  { label: "Net worth", value: 842000, delta: "+6.8%", tone: "positive" },
  { label: "Monthly spend", value: 98549, delta: "-4.1%", tone: "positive" },
  { label: "Savings rate", value: 21.2, delta: "+2.4%", tone: "positive" },
  { label: "Debt balance", value: 1902000, delta: "-1.2%", tone: "positive" },
];

export const cashFlow = [
  { month: "Jan", income: 120000, spend: 86500 },
  { month: "Feb", income: 120000, spend: 91200 },
  { month: "Mar", income: 125000, spend: 99800 },
  { month: "Apr", income: 125000, spend: 90200 },
  { month: "May", income: 125000, spend: 103600 },
  { month: "Jun", income: 125000, spend: 98549 },
];

export const transactions = [
  { date: "2026-06-18", merchant: "Zerodha Coin", category: "Other", amount: -18000, status: "Planned" },
  { date: "2026-06-16", merchant: "FreshMart", category: "Food", amount: -2800, status: "Cleared" },
  { date: "2026-06-12", merchant: "HDFC Bank", category: "EMI/Loan", amount: -21000, status: "Cleared" },
  { date: "2026-06-08", merchant: "Employer", category: "Salary/Income", amount: 125000, status: "Cleared" },
  { date: "2026-06-05", merchant: "Zomato", category: "Food", amount: -2400, status: "Review" },
];

export const budgets = [
  { category: "Bills", spent: 32000, limit: 35000, priority: "Essential" },
  { category: "Food", spent: 11400, limit: 14000, priority: "Essential" },
  { category: "Entertainment", spent: 649, limit: 9000, priority: "Watch" },
  { category: "Transport", spent: 6200, limit: 8000, priority: "Normal" },
];

export const salaryBuckets = [
  { bucket: "Essentials", amount: 62500, note: "Rent, groceries, utilities, transport" },
  { bucket: "Debt EMIs", amount: 29000, note: "Minimum debt obligations" },
  { bucket: "Investments", amount: 18000, note: "Automated SIP on salary day" },
  { bucket: "Emergency fund", amount: 10000, note: "Until six months of expenses" },
  { bucket: "Flexible", amount: 5500, note: "Dining, shopping, entertainment" },
];

export const debts = [
  { lender: "ICICI Card", type: "Credit Card", balance: 42000, rate: 36, emi: 8000, due: 22 },
  { lender: "HDFC Bank", type: "Home Loan", balance: 1860000, rate: 8.6, emi: 21000, due: 5 },
];

export const investments = [
  { name: "Emergency fund", value: 145000, target: 360000, risk: "Low" },
  { name: "Index fund SIP", value: 286000, target: 600000, risk: "Medium" },
  { name: "Tax saver fund", value: 122000, target: 150000, risk: "Medium" },
];

export const copilotPrompts = [
  "Where am I overspending this month?",
  "How should I allocate my next salary?",
  "Which debt should I prepay first?",
];

export const PIE_COLORS = ["#14b8a6", "#0f766e", "#f59e0b", "#6366f1", "#ec4899", "#94a3b8", "#f97316", "#8b5cf6"];
