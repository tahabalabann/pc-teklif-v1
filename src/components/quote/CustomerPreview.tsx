import type { Quote } from "../../types/quote";
import { calculateGrandTotal, calculatePartsTotal } from "../../utils/quote";
import { formatCurrency } from "../../utils/money";
import { formatDisplayDate } from "../../utils/date";
import { Card } from "../ui/Card";

interface CustomerPreviewProps {
  quote: Quote;
}

export function CustomerPreview({ quote }: CustomerPreviewProps) {
  const visibleRows = quote.rows.filter((row) => row.product || row.description || row.salePrice > 0);
  const partsTotal = calculatePartsTotal(quote.rows);
  const total = calculateGrandTotal(quote);

  return (
    <main className="space-y-6">
      <Card className="overflow-hidden">
        <div className="border-b border-ink-100 bg-white px-6 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-4">
              {quote.companyLogo ? (
                <img src={quote.companyLogo} alt={quote.companyName} className="h-14 w-14 rounded-2xl object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-700">
                  {quote.companyName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">{"M\u00fc\u015fteri Teklifi"}</p>
                <h2 className="mt-1 text-2xl font-bold text-ink-900">{quote.companyName}</h2>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-ink-600">
              <p>
                <span className="font-semibold text-ink-900">{"M\u00fc\u015fteri:"}</span> {quote.customerName || "-"}
              </p>
              <p>
                <span className="font-semibold text-ink-900">Tarih:</span> {formatDisplayDate(quote.date)}
              </p>
              <p>
                <span className="font-semibold text-ink-900">Teklif No:</span> {quote.quoteNo}
              </p>
              <p>
                <span className="font-semibold text-ink-900">Durum:</span> {quote.status}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="overflow-hidden rounded-2xl border border-ink-100">
            <table className="min-w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs uppercase tracking-[0.16em] text-ink-500">
                <tr>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">{"\u00dcr\u00fcn"}</th>
                  <th className="px-4 py-3">{"A\u00e7\u0131klama"}</th>
                  <th className="px-4 py-3 text-right">Fiyat</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-ink-500" colSpan={4}>
                      {"Hen\u00fcz \u00fcr\u00fcn sat\u0131r\u0131 eklenmedi."}
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr key={row.id} className="border-t border-ink-100">
                      <td className="px-4 py-3 font-medium text-ink-700">{row.category}</td>
                      <td className="px-4 py-3 text-ink-900">{row.product || "-"}</td>
                      <td className="px-4 py-3 text-ink-600">{row.description || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-semibold text-ink-900">{formatCurrency(row.salePrice, quote.currency)}</div>
                        {quote.exchangeRate && quote.exchangeRate > 0 && quote.exchangeRate !== 1 && (
                          <div className="text-[10px] text-ink-500 font-normal">
                             {quote.currency === "TRY" 
                               ? formatCurrency(row.salePrice / quote.exchangeRate, "USD") 
                               : formatCurrency(row.salePrice * quote.exchangeRate, "TRY")}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <InfoBlock title="Notlar" value={quote.notes} />
              <InfoBlock title="Garanti / Test Durumu" value={quote.warrantyInfo} />
              <InfoBlock title={"Sat\u0131c\u0131 \u0130leti\u015fim"} value={quote.sellerInfo} />
            </div>
            <div className="rounded-3xl bg-ink-900 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.16em] text-brand-200">{"Fiyat \u00d6zeti"}</p>
              <div className="mt-5 space-y-3">
                <PriceRow 
                  label={"Par\u00e7a Toplam\u0131"} 
                  value={formatCurrency(partsTotal, quote.currency)} 
                  secondaryValue={quote.exchangeRate && quote.exchangeRate > 0 && quote.exchangeRate !== 1 ? (quote.currency === "TRY" ? formatCurrency(partsTotal / quote.exchangeRate, "USD") : formatCurrency(partsTotal * quote.exchangeRate, "TRY")) : undefined}
                />
                <PriceRow 
                  label={"\u0130\u015f\u00e7ilik / Montaj"} 
                  value={formatCurrency(quote.labor, quote.currency)} 
                  secondaryValue={quote.exchangeRate && quote.exchangeRate > 0 && quote.exchangeRate !== 1 ? (quote.currency === "TRY" ? formatCurrency(quote.labor / quote.exchangeRate, "USD") : formatCurrency(quote.labor * quote.exchangeRate, "TRY")) : undefined}
                />
                <PriceRow 
                  label="Kargo" 
                  value={formatCurrency(quote.shipping, quote.currency)} 
                  secondaryValue={quote.exchangeRate && quote.exchangeRate > 0 && quote.exchangeRate !== 1 ? (quote.currency === "TRY" ? formatCurrency(quote.shipping / quote.exchangeRate, "USD") : formatCurrency(quote.shipping * quote.exchangeRate, "TRY")) : undefined}
                />
                <PriceRow 
                  label={"\u0130ndirim"} 
                  value={`-${formatCurrency(quote.discount, quote.currency)}`} 
                  secondaryValue={quote.exchangeRate && quote.exchangeRate > 0 && quote.exchangeRate !== 1 ? (quote.currency === "TRY" ? formatCurrency(quote.discount / quote.exchangeRate, "USD") : formatCurrency(quote.discount * quote.exchangeRate, "TRY")) : undefined}
                />
              </div>
              <div className="mt-5 border-t border-white/10 pt-5">
                <PriceRow 
                  label="Genel Toplam" 
                  value={formatCurrency(total, quote.currency)} 
                  strong 
                  secondaryValue={quote.exchangeRate && quote.exchangeRate > 0 && quote.exchangeRate !== 1 ? (quote.currency === "TRY" ? formatCurrency(total / quote.exchangeRate, "USD") : formatCurrency(total * quote.exchangeRate, "TRY")) : undefined}
                />
                {quote.cashPrice > 0 && <PriceRow label="Nakit Fiyat" value={formatCurrency(quote.cashPrice, quote.currency)} />}
                {quote.tradePrice > 0 && <PriceRow label={"Takas Fiyat\u0131"} value={formatCurrency(quote.tradePrice, quote.currency)} />}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </main>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-4">
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-600">{value || "-"}</p>
    </div>
  );
}

function PriceRow({ 
  label, 
  value, 
  strong = false,
  secondaryValue 
}: { 
  label: string; 
  value: string; 
  strong?: boolean;
  secondaryValue?: string;
}) {
  return (
    <div className="space-y-0.5">
      <div className={`flex items-center justify-between gap-3 ${strong ? "text-lg font-bold" : "text-sm"}`}>
        <span className={strong ? "text-white" : "text-brand-100"}>{label}</span>
        <span className="text-white">{value}</span>
      </div>
      {secondaryValue && (
        <div className="text-right text-[11px] text-brand-300 font-medium">
          {secondaryValue}
        </div>
      )}
    </div>
  );
}
