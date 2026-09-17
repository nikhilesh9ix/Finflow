import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import { useAuthStore } from "../store/auth";

const schema = z.object({
  full_name: z.string().min(2, "Enter your full name").max(160),
  email: z.string().email(),
  // Mirrors the backend rule (min 8) so the failure shows inline, not as a 422.
  password: z.string().min(8, "At least 8 characters"),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerUser, token, loading } = useAuthStore();
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  if (token) return <Navigate to="/" replace />;

  return (
    <main className="grid min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,rgba(13,148,136,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.12),transparent_50%)] text-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-center px-8 py-12 sm:px-12 lg:px-20 lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-4.5 py-1.5 text-xs font-bold uppercase tracking-wider text-teal-300">
            <ShieldCheck className="h-4 w-4 text-teal-400" aria-hidden="true" />
            Your data, your numbers
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl bg-linear-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Create account
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 font-medium">
            Set up your profile, import a bank statement, and every figure in FinFlow is computed
            from your own transactions.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { title: "Import CSV", copy: "Bring your own bank statement" },
              { title: "Set budgets", copy: "Guardrails per category" },
              { title: "Ask the copilot", copy: "Answers from your real data" },
            ].map((item) => (
              <div
                className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xs transition duration-300 hover:-translate-y-1 hover:bg-white/[0.06] hover:border-white/10 hover:shadow-lg"
                key={item.title}
              >
                <p className="text-sm font-bold text-teal-300">{item.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{item.copy}</p>
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
              await registerUser(values);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Unable to create account");
            }
          })}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Get started
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Takes a moment. You can import transactions right after.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="form-label" htmlFor="full_name">Full name</label>
              <input autoComplete="name" className="input mt-2" id="full_name" {...register("full_name")} />
              {formState.errors.full_name && (
                <p className="form-error">{formState.errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="form-label" htmlFor="email">Email</label>
              <input autoComplete="email" className="input mt-2" id="email" type="email" {...register("email")} />
              {formState.errors.email && <p className="form-error">{formState.errors.email.message}</p>}
            </div>

            <div>
              <label className="form-label" htmlFor="password">Password</label>
              <input
                autoComplete="new-password"
                className="input mt-2"
                id="password"
                type="password"
                {...register("password")}
              />
              {formState.errors.password && (
                <p className="form-error">{formState.errors.password.message}</p>
              )}
            </div>
          </div>

          <p className="mt-5 rounded-2xl bg-slate-100/80 p-4 text-xs leading-relaxed text-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
            No need to enter your income. It is worked out from the salary credits in the bank
            statement you import next.
          </p>

          {error && (
            <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/65 p-4 text-xs font-semibold text-rose-700 dark:border-rose-950/80 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          )}

          <button className="primary-button mt-8 w-full" disabled={loading} type="submit">
            {loading ? "Creating account..." : "Create account"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already registered?{" "}
            <Link className="font-semibold text-teal-600 hover:underline dark:text-teal-400" to="/login">
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
