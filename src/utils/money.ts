import { sanitizeNumber } from "./quote";

const tryCurrency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

export const formatCurrency = (value: number) => tryCurrency.format(sanitizeNumber(value));

export const formatInputNumber = (value: number) => {
  const safeValue = sanitizeNumber(value);
  return safeValue === 0 ? "" : String(safeValue);
};
