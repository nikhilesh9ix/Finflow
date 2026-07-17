import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[720px] border-collapse text-left text-sm">{children}</table></div>;
}

export function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return <th className={`border-b border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 ${align === "right" ? "text-right" : ""}`}>{children}</th>;
}

export function Td({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return <td className={`border-b border-slate-100 px-4 py-3 text-slate-700 dark:border-slate-800 dark:text-slate-200 ${align === "right" ? "text-right" : ""}`}>{children}</td>;
}
