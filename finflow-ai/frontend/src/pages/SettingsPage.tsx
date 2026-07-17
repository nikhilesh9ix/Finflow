import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Card, CardHeader } from "../components/Card";
import { Input } from "../components/Input";
import { EmptyState, ErrorState, LoadingSkeleton } from "../components/State";
import { useToast } from "../components/Toast";
import { api, type AuthUser, type InvestmentProfile } from "../services/api";

export function SettingsPage() {
  const { showToast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<InvestmentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ risk_profile: "balanced", monthly_investment_capacity: "0", emergency_fund_target: "0", emergency_fund_current: "0", notes: "" });

  const loadSettings = useCallback(() => {
    setLoading(true);
    Promise.all([api.getCurrentUser(), api.getInvestmentProfile()])
      .then(([currentUser, investmentProfile]) => {
        setUser(currentUser);
        setProfile(investmentProfile);
        setForm({
          risk_profile: investmentProfile.risk_profile,
          monthly_investment_capacity: String(investmentProfile.monthly_investment_capacity),
          emergency_fund_target: String(investmentProfile.emergency_fund_target),
          emergency_fund_current: String(investmentProfile.emergency_fund_current),
          notes: investmentProfile.notes ?? "",
        });
        setError("");
      })
      .catch((err) => {
        setUser(null);
        setProfile(null);
        setError(err instanceof Error ? err.message : "Unable to load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.upsertInvestmentProfile({
        risk_profile: form.risk_profile,
        monthly_investment_capacity: Number(form.monthly_investment_capacity),
        emergency_fund_target: Number(form.emergency_fund_target),
        emergency_fund_current: Number(form.emergency_fund_current),
        notes: form.notes || null,
      });
      setProfile(updated);
      showToast("Settings saved successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="cards" />;

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl">
        <CardHeader eyebrow="Profile" title="Settings" />
        {error && <ErrorState message={error} action={<Button onClick={loadSettings} type="button" variant="secondary">Retry</Button>} />}
        {!user && !profile ? (
          <EmptyState title="No profile loaded" body="Retry loading settings once the backend is available." />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" defaultValue={user?.full_name ?? ""} disabled />
              <Input label="Email" defaultValue={user?.email ?? ""} disabled type="email" />
              <Input label="Monthly income" defaultValue={String(user?.monthly_income ?? 0)} disabled type="number" />
              <Input label="Currency" defaultValue={user?.currency ?? "INR"} disabled />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Risk profile" onChange={(event) => setForm((current) => ({ ...current, risk_profile: event.target.value }))} value={form.risk_profile} />
              <Input label="Monthly investment capacity" onChange={(event) => setForm((current) => ({ ...current, monthly_investment_capacity: event.target.value }))} type="number" value={form.monthly_investment_capacity} />
              <Input label="Emergency fund target" onChange={(event) => setForm((current) => ({ ...current, emergency_fund_target: event.target.value }))} type="number" value={form.emergency_fund_target} />
              <Input label="Emergency fund current" onChange={(event) => setForm((current) => ({ ...current, emergency_fund_current: event.target.value }))} type="number" value={form.emergency_fund_current} />
              <div className="sm:col-span-2">
                <Input label="Notes" onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Priority reminders or allocation rules" value={form.notes} />
              </div>
            </div>
            <Button disabled={saving} onClick={handleSave} type="button">{saving ? "Saving..." : "Save changes"}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}