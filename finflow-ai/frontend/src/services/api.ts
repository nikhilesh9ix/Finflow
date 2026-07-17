export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const tokenKey = "finflow-auth-token";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type Transaction = {
  id: number;
  transaction_date: string;
  description: string;
  merchant: string | null;
  category: string;
  amount: number;
  transaction_type: "income" | "expense" | "transfer";
  source: string;
};

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
  status: "safe" | "warning" | "overspent";
};

export type MonthlySummary = {
  trend: { month: string; spend: number }[];
  current_month: { month: string; income: number; expense: number; net: number };
  income_vs_expense: { month: string; income: number; expense: number }[];
};

export type CategorySummary = { category: string; amount: number }[];
export type TopMerchant = { merchant: string; amount: number };
export type RecurringTransaction = { merchant: string; category: string; average_amount: number; count: number };

export type AnalyticsSummary = {
  monthly_spend: { month: string; spend: number }[];
  current_month: { month: string; income: number; expense: number; net: number };
  category_breakdown: CategorySummary;
  income_vs_expense: { month: string; income: number; expense: number }[];
  recurring_transactions: RecurringTransaction[];
  top_merchants: TopMerchant[];
  recent_transactions: Transaction[];
  budget_alerts: BudgetAlert[];
};

export type CsvUploadResult = {
  imported: number;
  skipped: number;
  errors: { row: number; error: string; raw?: Record<string, string> }[];
};

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  monthly_income: number;
  currency: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  full_name: string;
  password: string;
  monthly_income: number;
  currency: string;
};

export type DebtAccount = {
  id: number;
  lender: string;
  debt_type: string;
  outstanding_amount: number;
  interest_rate: number;
  emi_amount: number;
  due_day: number;
};

export type SavingsGoal = {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
};

export type InvestmentProfile = {
  id: number;
  risk_profile: string;
  monthly_investment_capacity: number;
  emergency_fund_target: number;
  emergency_fund_current: number;
  notes: string | null;
};

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  message: string;
  created_at: string;
  updated_at: string;
};

export type ChatMessageCreateRequest = {
  role: "user" | "assistant";
  message: string;
};

export type SalaryPlan = {
  income: number;
  allocations: { bucket: string; amount: number; note: string }[];
};

export type DebtStrategy = {
  method: string;
  total_outstanding: number;
  monthly_emi: number;
  priority: DebtAccount[];
  insight: string;
};

export type InvestmentProfileSummary = {
  risk_profile: string;
  monthly_investment_capacity: number;
  emergency_fund_target: number;
  emergency_fund_current: number;
  emergency_gap: number;
  readiness: string;
};

export type CopilotAskResponse = {
  answer: string;
  data_status: string;
};

type RequestOptions = RequestInit & {
  token?: string | null;
  retries?: number;
  auth?: boolean;
};

function formatApiError(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => (typeof item === "object" && item && "msg" in item ? String(item.msg) : String(item))).join(", ");
  return "Request failed";
}

export function getStoredToken() {
  return localStorage.getItem(tokenKey);
}

export function setStoredToken(token: string) {
  localStorage.setItem(tokenKey, token);
}

export function clearStoredToken() {
  localStorage.removeItem(tokenKey);
}

function isRetryableError(error: unknown) {
  return error instanceof TypeError || error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, retries = 1, auth = true, ...init } = options;
  const headers = new Headers(init.headers);
  const isFormData = init.body instanceof FormData;

  if (!isFormData && init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (auth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: "Request failed" }));
        throw new ApiError(formatApiError(body.detail), response.status);
      }
      if (response.status === 204) return undefined as T;
      return response.json() as Promise<T>;
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isRetryableError(error)) break;
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  throw new ApiError(lastError instanceof Error ? lastError.message : "Request failed", 0);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, { ...options, token: getStoredToken(), retries: 1 });
}

export const api = {
  login: (payload: LoginRequest) => request<{ access_token: string; token_type: string }>("/auth/login", { method: "POST", body: JSON.stringify(payload), auth: false, retries: 0 }),
  register: (payload: RegisterRequest) => request<AuthUser>("/auth/register", { method: "POST", body: JSON.stringify(payload), auth: false, retries: 0 }),
  getCurrentUser: (token?: string | null) => request<AuthUser>("/users/me", { token }),
  getChatHistory: (token?: string | null) => request<ChatMessage[]>("/chat-history", { token }),
  createChatMessage: (payload: ChatMessageCreateRequest, token?: string | null) => request<ChatMessage>("/chat-history", { method: "POST", body: JSON.stringify(payload), token }),
  getTransactions: () => apiFetch<Transaction[]>("/transactions"),
  uploadTransactions: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<CsvUploadResult>("/transactions/upload", { method: "POST", body: formData });
  },
  getMonthlySummary: () => apiFetch<MonthlySummary>("/transactions/summary/monthly"),
  getCategorySummary: () => apiFetch<CategorySummary>("/transactions/summary/categories"),
  getTopMerchants: () => apiFetch<TopMerchant[]>("/transactions/summary/top-merchants"),
  getRecentTransactions: () => apiFetch<Transaction[]>("/transactions/recent"),
  getRecurringTransactions: () => apiFetch<RecurringTransaction[]>("/transactions/recurring"),
  getAnalyticsSummary: () => apiFetch<AnalyticsSummary>("/analytics/summary"),
  getBudgets: () => apiFetch<Budget[]>("/budgets"),
  getBudgetAlerts: () => apiFetch<BudgetAlert[]>("/budgets/alerts"),
  createBudget: (payload: { category: string; monthly_limit: number; priority: string }) =>
    apiFetch<Budget>("/budgets", { method: "POST", body: JSON.stringify(payload) }),
  updateBudget: (id: number, payload: { category?: string; monthly_limit?: number; priority?: string }) =>
    apiFetch<Budget>(`/budgets/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  getDebtAccounts: () => apiFetch<DebtAccount[]>("/debt-accounts"),
  getDebtStrategy: () => apiFetch<DebtStrategy>("/debt-accounts/strategy"),
  getSalaryPlan: () => apiFetch<SalaryPlan>("/salary-plan"),
  getSavingsGoals: () => apiFetch<SavingsGoal[]>("/savings-goals"),
  getInvestmentProfile: () => apiFetch<InvestmentProfile>("/investment-profile"),
  getInvestmentProfileSummary: () => apiFetch<InvestmentProfileSummary>("/investment-profile/summary"),
  upsertInvestmentProfile: (payload: Partial<InvestmentProfile>) => apiFetch<InvestmentProfile>("/investment-profile", { method: "PUT", body: JSON.stringify(payload) }),
  askCopilot: (question: string) => apiFetch<CopilotAskResponse>("/copilot/ask", { method: "POST", body: JSON.stringify({ question }) }),
};
