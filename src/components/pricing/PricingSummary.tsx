import type { Quote } from "../../types/quote";
import {
  calculateEstimatedProfit,
  calculateGrandTotal,
  calculatePartsCostTotal,
  calculatePartsTotal,
  sanitizeNumber,
} from "../../utils/quote";
import { formatCurrency, formatInputNumber } from "../../utils/money";
import { Card } from "../ui/Card";

interface PricingSummaryProps {
  quote: Quote;
  onNumberChange: (field: keyof Quote, value: number) => void;
  compact?: boolean;
}

const editableFields: Array<{ key: keyof Quote; label: string }> = [
  { key: "labor", label: "\u0130\u015f\u00e7ilik / Montaj" },
  { key: "shipping", label: "Kargo" },
  { key: "discount", label: "\u0130ndirim" },
  { key: "cashPrice", label: "Nakit Fiyat" },
  { key: "tradePrice", label: "Takas Fiyat\u0131" },
  { key: "salesPrice", label: "M\u00fc\u015fteri Sat\u0131\u015f Fiyat\u0131" },
  { key: "costPrice", label: "Ek Maliyet / Masraf" },
];

export function PricingSummary({ quote, onNumberChange, compact = false }: PricingSummaryProps) {
  const partsSaleTotal = calculatePartsTotal(quote.rows);
  const partsCostTotal = calculatePartsCostTotal(quote.rows);
  const grandTotal = calculateGrandTotal(quote);
  const estimatedProfit = calculateEstimatedProfit(quote);
  const totalCost = partsCostTotal + sanitizeNumber(quote.costPrice);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">{"Fiyat ve Karl\u0131l\u0131k"}</h2>
          <p className="mt-1 text-sm text-ink-600">
            {"Par\u00e7a bazl\u0131 al\u0131\u015f ve sat\u0131\u015f tutarlar\u0131n\u0131 y\u00f6netin, toplam maliyeti ve k\u00e2r\u0131 anl\u0131k g\u00f6r\u00fcn."}
          </p>
        </div>
        <div className="rounded-2xl bg-brand-50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-brand-600">Genel Toplam</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{formatCurrency(grandTotal)}</p>
        </div>
      </div>

      {!compact && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {editableFields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-600">{field.label}</span>
              <input
                className="field"
                inputMode="decimal"
                value={formatInputNumber(sanitizeNumber(quote[field.key]))}
                onChange={(event) => onNumberChange(field.key, sanitizeNumber(event.target.value))}
                placeholder="0"
              />
            </label>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={"Par\u00e7a Sat\u0131\u015f Toplam\u0131"} value={formatCurrency(partsSaleTotal)} />
        <Metric label={"Par\u00e7a Al\u0131\u015f Toplam\u0131"} value={formatCurrency(partsCostTotal)} />
        <Metric label={"Toplam Maliyet"} value={formatCurrency(totalCost)} />
        <Metric
          label={"Tahmini K\u00e2r"}
          value={formatCurrency(estimatedProfit)}
          accent={estimatedProfit < 0 ? "negative" : "positive"}
        />
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "positive" | "negative";
}) {
  const accentClass =
    accent === "positive"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : accent === "negative"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-ink-200 bg-ink-50 text-ink-700";

  return (
    <div className={`rounded-2xl border p-4 ${accentClass}`}>
      <p className="text-xs uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
    </div>
  );
}
