import type { ReactNode } from "react";
import { cn } from "../utils/cn";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
  danger: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", tones[tone])}>{children}</span>;
}
