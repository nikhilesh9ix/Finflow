import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useToast } from "../components/Toast";
import { useAuth } from "../store/auth";

export function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", monthly_income: "125000", currency: "INR", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await signUp({
        full_name: form.full_name,
        email: form.email,
        monthly_income: Number(form.monthly_income),
        currency: form.currency,
        password: form.password,
      });
      showToast("Account created successfully.");
      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create account";
      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <Card className="w-full max-w-xl">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">Start your workspace</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Create your FinFlow account</h1>
          {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} placeholder="Nikhil Kumar" value={form.full_name} />
            <Input label="Email" onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" type="email" value={form.email} />
            <Input label="Monthly income" onChange={(event) => setForm((current) => ({ ...current, monthly_income: event.target.value }))} placeholder="125000" type="number" value={form.monthly_income} />
            <Input label="Currency" onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} value={form.currency} />
            <div className="sm:col-span-2"><Input label="Password" onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} type="password" value={form.password} /></div>
          </div>
          <Button className="mt-6 w-full" disabled={submitting} type="submit">{submitting ? "Creating account..." : "Create account"}</Button>
          <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link className="font-bold text-teal-700 dark:text-teal-300" to="/login">Sign in</Link></p>
        </form>
      </Card>
    </main>
  );
}
