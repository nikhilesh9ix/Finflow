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
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-slate-500">Name</dt><dd className="font-semibold">{user?.name}</dd></div>
          <div><dt className="text-sm text-slate-500">Email</dt><dd className="font-semibold">{user?.email}</dd></div>
          <div><dt className="text-sm text-slate-500">Monthly income</dt><dd className="font-semibold">{formatCurrency(user?.monthly_income ?? 0)}</dd></div>
          <div><dt className="text-sm text-slate-500">Risk profile</dt><dd className="font-semibold capitalize">{user?.risk_profile}</dd></div>
        </dl>
      </div>
    </div>
  );
}
