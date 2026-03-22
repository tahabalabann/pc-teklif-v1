import { sanitizeNumber } from "./quote";

const currencies = {
  TRY: new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }),
  EUR: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }),
  GBP: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 2 }),
};

export const formatCurrency = (value: number, currency: "TRY" | "USD" | "EUR" | "GBP" = "TRY") => {
  return currencies[currency].format(sanitizeNumber(value));
};

export const formatInputNumber = (value: number) => {
  const safeValue = sanitizeNumber(value);
  return safeValue === 0 ? "" : String(safeValue);
};

/** Check if quote has a valid secondary currency */
export const hasSecondaryCurrency = (exchangeRate?: number): boolean =>
  Boolean(exchangeRate && exchangeRate > 0 && exchangeRate !== 1);

/** Format a value in the secondary currency based on the primary currency and exchange rate */
export const formatSecondaryCurrency = (
  value: number,
  primaryCurrency: "TRY" | "USD" | "EUR" | "GBP" = "TRY",
  exchangeRate?: number,
): string | null => {
  if (!hasSecondaryCurrency(exchangeRate)) return null;
  const rate = exchangeRate!;
  return primaryCurrency === "TRY"
    ? formatCurrency(value / rate, "USD")
    : formatCurrency(value * rate, "TRY");
};
