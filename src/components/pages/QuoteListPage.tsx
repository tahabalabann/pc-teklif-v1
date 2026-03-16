import type { Quote } from "../../types/quote";
import { formatDateTime, formatDisplayDate } from "../../utils/date";
import { formatCurrency } from "../../utils/money";
import { calculateGrandTotal, sanitizeQuote } from "../../utils/quote";
import { SavedQuotesPanel } from "../saved/SavedQuotesPanel";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface QuoteListPageProps {
  activeQuote: Quote;
  savedQuotes: Quote[];
  onOpenQuote: (id: string) => void;
  onDuplicateQuote: (id: string) => void;
  onDeleteQuote: (id: string) => void;
  onOpenDetail: () => void;
  onNewQuote: () => void;
}

export function QuoteListPage({
  activeQuote,
  savedQuotes,
  onOpenQuote,
  onDuplicateQuote,
  onDeleteQuote,
  onOpenDetail,
  onNewQuote,
}: QuoteListPageProps) {
  const normalizedSavedQuotes = savedQuotes.map(sanitizeQuote);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Teklifler / Liste</p>
              <h2 className="mt-2 text-lg font-semibold text-ink-900">Teklif Listesi</h2>
              <p className="mt-1 text-sm text-ink-600">
                Sağ panelden kayıtlı teklifleri açın. Sol tarafta aktif teklifin kısa özetini görüp detay düzenleme ekranına geçin.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onNewQuote} type="button">
                Yeni Teklif
              </Button>
              <Button onClick={onOpenDetail} type="button" variant="primary">
                Teklif Detayına Geç
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Teklif No" value={activeQuote.quoteNo} />
            <Info label="Müşteri" value={activeQuote.customerName || "-"} />
            <Info label="Durum" value={activeQuote.status} />
            <Info label="Toplam" value={formatCurrency(calculateGrandTotal(activeQuote))} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Info label="Tarih" value={formatDisplayDate(activeQuote.date)} />
            <Info label="Son Güncelleme" value={formatDateTime(activeQuote.updatedAt)} />
          </div>
        </Card>
      </div>

      <aside>
        <SavedQuotesPanel
          currentQuoteId={activeQuote.id}
          quotes={normalizedSavedQuotes}
          onOpen={onOpenQuote}
          onDuplicate={onDuplicateQuote}
          onDelete={onDeleteQuote}
        />
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white/90 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
