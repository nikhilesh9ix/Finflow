export function LoadingState({ label = "Loading financial data" }: { label?: string }) {
  return (
    <div className="grid min-h-[260px] place-items-center rounded-lg border border-dashed border-slate-300 bg-white/70 p-8 text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" aria-label={label} />
    </div>
  );
}
