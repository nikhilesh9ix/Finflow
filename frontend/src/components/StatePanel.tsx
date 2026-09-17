import { AlertCircle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingSkeleton({ variant = "cards" }: { variant?: "cards" | "table" | "chat" }) {
  if (variant === "table") {
    return (
      <div className="panel space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" key={index} />
        ))}
      </div>
    );
  }

  if (variant === "chat") {
    return (
      <div className="panel space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="h-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" key={index} />
      ))}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 py-10 text-center">
      <Inbox className="h-8 w-8 text-slate-500 dark:text-slate-400" aria-hidden="true" />
      <div>
        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{body}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="panel border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm">{body}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
