export const FANTASY_CURRENCY_SYMBOL = "₴";

function normalizeMoneyValue(
  value: number | null | undefined,
  fallback: number,
) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

export function formatFantasyMoney(
  value: number | null | undefined,
  options: { fallback?: number } = {},
) {
  const normalized = Number(
    normalizeMoneyValue(value, options.fallback ?? 0).toFixed(1),
  );
  const sign = normalized < 0 ? "-" : "";
  return sign + FANTASY_CURRENCY_SYMBOL + Math.abs(normalized).toFixed(1) + "M";
}

export function formatFantasyMoneyDelta(value: number | null | undefined) {
  const normalized = Number(normalizeMoneyValue(value, 0).toFixed(1));
  const sign = normalized > 0 ? "+" : normalized < 0 ? "-" : "";
  return sign + FANTASY_CURRENCY_SYMBOL + Math.abs(normalized).toFixed(1) + "M";
}
