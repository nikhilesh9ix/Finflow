import { AlertCircle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "./Card";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="grid place-items-center py-10 text-center">
      <Inbox className="mb-3 h-9 w-9 text-slate-400" />
      <h3 className="font-bold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </Card>
  );
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <Card className="border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </Card>
  );
}

export function LoadingSkeleton({ variant = "dashboard" }: { variant?: "dashboard" | "cards" | "table" }) {
  if (variant === "table") {
    return (
      <Card>
        <div className="space-y-3">
          <div className="h-6 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="grid gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800" key={index}>
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (variant === "cards") {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" key={index} />
      ))}
    </div>
  );
}
