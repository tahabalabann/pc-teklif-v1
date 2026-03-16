import { useMemo, useState } from "react";
import type { Quote, QuoteStatus } from "../../types/quote";
import { formatDateTime, formatDisplayDate } from "../../utils/date";
import { formatCurrency } from "../../utils/money";
import { calculateGrandTotal } from "../../utils/quote";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface SavedQuotesPanelProps {
  currentQuoteId: string;
  quotes: Quote[];
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const filters: Array<QuoteStatus | "Tüm"> = [
  "Tüm",
  "Yeni Teklif",
  "Onay Bekliyor",
  "Ödeme Alındı",
  "Hazırlanıyor",
  "Kargolandı",
  "Teslim Edildi",
  "Tamamlandı",
  "İptal",
];

export function SavedQuotesPanel({
  currentQuoteId,
  quotes,
  onOpen,
  onDuplicate,
  onDelete,
}: SavedQuotesPanelProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<QuoteStatus | "Tüm">("Tüm");

  const filteredQuotes = useMemo(() => {
    return [...quotes]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .filter((quote) => {
        const matchesQuery =
          !query ||
          [quote.customerName, quote.quoteNo, quote.companyName].some((value) =>
            value.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
          );
        const matchesStatus = status === "Tüm" || quote.status === status;
        return matchesQuery && matchesStatus;
      });
  }, [query, quotes, status]);

  return (
    <Card className="sticky top-6 p-5 print:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Kayıtlı Teklifler</h2>
          <p className="mt-1 text-sm text-ink-600">Arayın, filtreleyin, açın veya kopyalayın.</p>
        </div>
        <div className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">
          {quotes.length} kayıt
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <input
          className="field"
          placeholder="Müşteri, teklif no veya firma ara"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className="field" value={status} onChange={(event) => setStatus(event.target.value as QuoteStatus | "Tüm")}>
          {filters.map((filterValue) => (
            <option key={filterValue} value={filterValue}>
              {filterValue}
            </option>
          ))}
        </select>
      </div>

      {filteredQuotes.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-5 text-sm text-ink-500">
          Kayıtlı teklif bulunamadı. İlk teklifi kaydettiğinizde burada listelenecek.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredQuotes.map((quote) => {
            const isActive = quote.id === currentQuoteId;
            return (
              <div
                key={quote.id}
                className={`rounded-2xl border p-4 transition ${
                  isActive ? "border-brand-300 bg-brand-50" : "border-ink-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{quote.customerName || "Adsız Müşteri"}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">{quote.quoteNo}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-600 ring-1 ring-ink-200">
                    {quote.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 text-sm text-ink-600">
                  <p>Tarih: {formatDisplayDate(quote.date)}</p>
                  <p>Toplam: {formatCurrency(calculateGrandTotal(quote))}</p>
                  <p>Güncelleme: {formatDateTime(quote.updatedAt)}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" onClick={() => onOpen(quote.id)} type="button" variant="ghost">
                    Aç
                  </Button>
                  <Button className="flex-1" onClick={() => onDuplicate(quote.id)} type="button" variant="secondary">
                    Kopyala
                  </Button>
                  <Button onClick={() => onDelete(quote.id)} type="button" variant="danger">
                    Sil
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
