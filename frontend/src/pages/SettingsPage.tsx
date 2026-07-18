import { useAuthStore } from "../store/auth";
import { formatCurrency } from "../lib/format";

export function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <section>
        <p className="section-kicker">Profile</p>
        <h2 className="section-title">Settings</h2>
      </section>

      <div className="panel max-w-2xl">
        <h3 className="panel-title mb-4">Account details</h3>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Name</dt>
            <dd className="mt-1 font-semibold">{user?.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="mt-1 font-semibold">{user?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Monthly income</dt>
            <dd className="mt-1 font-semibold">{formatCurrency(user?.monthly_income ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Currency</dt>
            <dd className="mt-1 font-semibold">{user?.currency ?? "INR"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
