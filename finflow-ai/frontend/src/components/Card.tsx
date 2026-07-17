import type { ReactNode } from "react";
import { cn } from "../utils/cn";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900", className)}>{children}</section>;
}

export function CardHeader({ title, eyebrow, action }: { title: string; eyebrow?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">{eyebrow}</p>}
        <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}
