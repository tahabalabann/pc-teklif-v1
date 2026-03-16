import type { Quote } from "../../types/quote";
import { formatCurrency } from "../../utils/money";
import { calculateEstimatedProfit, calculateGrandTotal, calculatePartsCostTotal, sanitizeNumber } from "../../utils/quote";
import { Card } from "../ui/Card";

interface AccountingOverviewProps {
  quotes: Quote[];
}

interface SummaryBlock {
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

const completedStatuses = new Set<Quote["status"]>(["Teslim Edildi", "Tamamlandı"]);

export function AccountingOverview({ quotes }: AccountingOverviewProps) {
  const soldQuotes = quotes.filter((quote) => completedStatuses.has(quote.status));
  const now = new Date();
  const currentMonthQuotes = soldQuotes.filter((quote) => {
    const date = new Date(quote.updatedAt || quote.date);
    return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const monthly = summarize(currentMonthQuotes);
  const total = summarize(soldQuotes);

  return (
    <Card className="p-5 print:hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Muhasebe Özeti</h2>
          <p className="mt-1 text-sm text-ink-600">
            Teslim edildi veya tamamlandı durumundaki teklifler baz alınır. Aylık ve toplam ciro, maliyet ve kârı hızlıca takip edin.
          </p>
        </div>
        <div className="rounded-2xl bg-brand-50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-brand-600">Toplam Satış</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{total.count}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <SummaryCard
          title="Bu Ay"
          subtitle="İçinde bulunduğumuz ay tamamlanan satışlar"
          summary={monthly}
          accent={monthly.profit < 0 ? "negative" : "positive"}
        />
        <SummaryCard
          title="Toplam"
          subtitle="Kaydedilmiş tüm tamamlanan satışlar"
          summary={total}
          accent={total.profit < 0 ? "negative" : "positive"}
        />
      </div>
    </Card>
  );
}

function summarize(quotes: Quote[]): SummaryBlock {
  return quotes.reduce<SummaryBlock>(
    (accumulator, quote) => {
      const revenue = sanitizeNumber(quote.salesPrice || calculateGrandTotal(quote));
      const cost = calculatePartsCostTotal(quote.rows) + sanitizeNumber(quote.costPrice);
      const profit = sanitizeNumber(calculateEstimatedProfit(quote));

      return {
        revenue: accumulator.revenue + revenue,
        cost: accumulator.cost + cost,
        profit: accumulator.profit + profit,
        count: accumulator.count + 1,
      };
    },
    { revenue: 0, cost: 0, profit: 0, count: 0 },
  );
}

function SummaryCard({
  title,
  subtitle,
  summary,
  accent,
}: {
  title: string;
  subtitle: string;
  summary: SummaryBlock;
  accent: "positive" | "negative";
}) {
  const accentClass = accent === "negative" ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50";

  return (
    <div className={`rounded-2xl border p-4 ${accentClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-ink-900">{title}</h3>
          <p className="mt-1 text-sm text-ink-600">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-white/90 px-3 py-2 text-center ring-1 ring-inset ring-white">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-500">Satış</p>
          <p className="mt-1 text-lg font-bold text-ink-900">{summary.count}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Ciro" value={formatCurrency(summary.revenue)} />
        <Metric label="Maliyet" value={formatCurrency(summary.cost)} />
        <Metric label="Kâr" value={formatCurrency(summary.profit)} strong />
      </div>
    </div>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-white/90 px-4 py-3 ring-1 ring-inset ring-white">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p className={`mt-2 ${strong ? "text-xl font-bold" : "text-lg font-semibold"} text-ink-900`}>{value}</p>
    </div>
  );
}
