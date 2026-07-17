import type { InputHTMLAttributes } from "react";
import { cn } from "../utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, id, error, className, ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 transition placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white",
          className,
        )}
        {...props}
      />
      {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
    </div>
  );
}
