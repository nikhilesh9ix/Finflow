import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { LoadingState } from "./components/LoadingState";
import { LoadingSkeleton } from "./components/StatePanel";
import { useAuthStore } from "./store/auth";

// Code-split every page — initial bundle only ships auth + shell.
// Each page chunk is fetched on first navigation to that route.
const DashboardPage    = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage").then((m) => ({ default: m.TransactionsPage })));
const BudgetsPage      = lazy(() => import("./pages/BudgetsPage").then((m) => ({ default: m.BudgetsPage })));
const SalaryPage       = lazy(() => import("./pages/SalaryPage").then((m) => ({ default: m.SalaryPage })));
const DebtsPage        = lazy(() => import("./pages/DebtsPage").then((m) => ({ default: m.DebtsPage })));
const InvestmentsPage  = lazy(() => import("./pages/InvestmentsPage").then((m) => ({ default: m.InvestmentsPage })));
const SettingsPage     = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const LoginPage        = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const RegisterPage     = lazy(() => import("./pages/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const NotFoundPage     = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

function PageFallback() {
  return <LoadingSkeleton />;
}

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
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoutes />}>
          <Route index element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="budgets" element={<BudgetsPage />} />
          <Route path="salary" element={<SalaryPage />} />
          <Route path="debts" element={<DebtsPage />} />
          <Route path="investments" element={<InvestmentsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
