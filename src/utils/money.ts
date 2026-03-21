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
