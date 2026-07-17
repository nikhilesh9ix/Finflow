import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { useToast } from "../components/Toast";
import { useAuth } from "../store/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("demo@finflow.ai");
  const [password, setPassword] = useState("demo12345");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await signIn({ email, password });
      showToast("Signed in successfully.");
      navigate("/", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in";
      setError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-slate-950 text-white lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex items-center px-6 py-10 sm:px-12">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-300">FinFlow AI</p>
          <h1 className="mt-4 text-5xl font-black tracking-tight">Your personal AI CFO.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">Budget smarter, route salary automatically, reduce debt, and find money leaks before they become habits.</p>
        </div>
      </section>
      <section className="flex items-center justify-center bg-slate-100 px-6 py-10 text-slate-950 dark:bg-slate-900 dark:text-white">
        <Card className="w-full max-w-md">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <h2 className="text-2xl font-black">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Demo account: demo@finflow.ai</p>
            {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</p>}
            <Input label="Email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
            <Input label="Password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            <Button className="w-full" disabled={submitting} icon={<ArrowRight className="h-4 w-4" />} type="submit">
              {submitting ? "Signing in..." : "Continue"}
            </Button>
            <p className="mt-5 text-center text-sm text-slate-500">New here? <Link className="font-bold text-teal-700 dark:text-teal-300" to="/register">Create account</Link></p>
          </form>
        </Card>
      </section>
    </main>
  );
}
