export function NotFoundPage() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">404</p>
      <h2 className="mt-3 text-2xl font-semibold">Page not found</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">The route you tried to open does not exist. Return to the dashboard to continue exploring FinFlow AI.</p>
    </div>
  );
}
