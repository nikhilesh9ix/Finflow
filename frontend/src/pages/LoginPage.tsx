import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../store/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login, token, loading } = useAuthStore();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "demo@finflow.ai", password: "demo12345" },
  });

  if (token) return <Navigate to="/" replace />;

  return (
    <main className="grid min-h-screen bg-[radial-gradient(ellipse_at_top_right,rgba(13,148,136,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.12),transparent_50%),#020617] text-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-center px-8 py-12 sm:px-12 lg:px-20 lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-450/10 px-4.5 py-1.5 text-xs font-bold uppercase tracking-wider text-teal-350">
            <ShieldCheck className="h-4 w-4 text-teal-400" aria-hidden="true" />
            Deterministic planning, AI enhanced
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl bg-linear-to-r from-white via-slate-100 to-slate-350 bg-clip-text text-transparent">FinFlow AI</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400 font-medium">
            A premium financial operating system for budgets, salary allocation, debt payoff, investing, and AI CFO guidance.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { title: "Cash flow", copy: "See the full picture in one place" },
              { title: "Wealth leaks", copy: "Spot pressure before it compounds" },
              { title: "Debt strategy", copy: "Prioritize with clarity" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xs transition duration-300 hover:-translate-y-1 hover:bg-white/[0.06] hover:border-white/10 hover:shadow-lg">
                <p className="text-sm font-bold text-teal-350">{item.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-450">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 px-6 py-10 text-slate-900 dark:from-slate-900 dark:to-slate-950 dark:text-white">
        <form
          className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/85 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/75 dark:shadow-[0_25px_60px_rgba(0,0,0,0.3)]"
          onSubmit={handleSubmit(async (values) => {
            setError("");
            try {
              await login(values.email, values.password);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Unable to sign in");
            }
          })}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Sign in</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Demo credentials are pre-filled so you can explore immediately.</p>
          
          <div className="mt-8 space-y-5">
            <div>
              <label className="form-label" htmlFor="email">Email</label>
              <input autoComplete="email" className="input mt-2" id="email" type="email" {...register("email")} />
              {formState.errors.email && <p className="form-error">{formState.errors.email.message}</p>}
            </div>
            
            <div>
              <label className="form-label" htmlFor="password">Password</label>
              <input autoComplete="current-password" className="input mt-2" id="password" type="password" {...register("password")} />
              {formState.errors.password && <p className="form-error">{formState.errors.password.message}</p>}
            </div>
          </div>
          
          {error && <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/65 p-4 text-xs font-semibold text-rose-700 dark:border-rose-950/80 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
          
          <button className="primary-button mt-8 w-full" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Enter FinFlow"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </section>
    </main>
  );
}
