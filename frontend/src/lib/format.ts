export const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));

export const formatPercent = (value: number | string) => `${Number(value).toFixed(1)}%`;

/** "2026-06" → "June 2026". Falls back to the raw value if it is not YYYY-MM. */
export const formatMonth = (monthKey: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey ?? "");
  if (!match) return monthKey;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};
