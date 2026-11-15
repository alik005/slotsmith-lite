export function formatMoney(cents: number, currency: string): string {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function parseMoneyToCents(input: string): number {
  const v = Number(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.round(v * 100);
}
