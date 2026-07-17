import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { SalaryPlannerPage } from "./pages/SalaryPlannerPage";
import { DebtManagerPage } from "./pages/DebtManagerPage";
import { InvestmentsPage } from "./pages/InvestmentsPage";
import { CopilotPage } from "./pages/CopilotPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AppLayout } from "./layouts/AppLayout";
import { useAuth } from "./store/auth";

function RequireAuth() {
  const { isAuthenticated, status } = useAuth();

  if (status === "loading") {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500 dark:text-slate-400">Checking session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
}

function PublicAuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, status } = useAuth();

  if (status === "loading") {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500 dark:text-slate-400">Checking session...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicAuthRoute>
            <LoginPage />
          </PublicAuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicAuthRoute>
            <RegisterPage />
          </PublicAuthRoute>
        }
      />
      <Route element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="salary-planner" element={<SalaryPlannerPage />} />
        <Route path="debt-manager" element={<DebtManagerPage />} />
        <Route path="investments" element={<InvestmentsPage />} />
        <Route path="ai-copilot" element={<CopilotPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
