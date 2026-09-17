import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  kind: ToastKind;
};

type ToastContextValue = {
  showToast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// Monotonic ids: Date.now() gave two toasts raised in the same millisecond the
// same React key, so one of them was dropped or rendered twice.
let nextToastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setTimeout(() => setToasts((items) => items.slice(1)), 3000);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const showToast = (message: string, kind: ToastKind = "info") => {
    setToasts((items) => [...items, { id: ++nextToastId, message, kind }]);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed right-4 top-4 z-50 flex w-[min(92vw,24rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${toast.kind === "error" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200" : toast.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"}`} role="status">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
