import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LoadingState } from "./components/LoadingState";
import { useAuthStore } from "./store/auth";
import { BudgetsPage } from "./pages/BudgetsPage";
import { CopilotPage } from "./pages/CopilotPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DebtsPage } from "./pages/DebtsPage";
import { InvestmentsPage } from "./pages/InvestmentsPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SalaryPage } from "./pages/SalaryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TransactionsPage } from "./pages/TransactionsPage";

function ProtectedRoutes() {
  const { token, loading } = useAuthStore();
  if (loading && !token) return <LoadingState label="Checking your session" />;
  if (!token) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

export default function App() {
  const { loadMe } = useAuthStore();

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoutes />}>
        <Route index element={<DashboardPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="salary" element={<SalaryPage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="investments" element={<InvestmentsPage />} />
        <Route path="copilot" element={<CopilotPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
