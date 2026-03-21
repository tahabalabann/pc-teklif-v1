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
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="panel-label">Teklifler / Liste</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink-900">Teklif Listesi</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
                Sag panelden kayitli teklifleri acin. Sol tarafta aktif teklifin kisa ozetini gorup detay
                duzenleme ekranina gecebilirsiniz.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onNewQuote} type="button">
                Yeni Teklif
              </Button>
              <Button onClick={onOpenDetail} type="button" variant="primary">
                Teklif Detayina Gec
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info label="Teklif No" value={activeQuote.quoteNo} />
            <Info label="Musteri" value={activeQuote.customerName || "-"} />
            <Info label="Durum" value={activeQuote.status} />
            <Info label="Toplam" value={formatCurrency(calculateGrandTotal(activeQuote))} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Info label="Tarih" value={formatDisplayDate(activeQuote.date)} />
            <Info label="Son Guncelleme" value={formatDateTime(activeQuote.updatedAt)} />
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
    <div className="animate-fade-in rounded-xl border border-ink-200/50 p-4 transition-colors hover:border-brand-200 glass">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-500">{label}</p>
      <p className="mt-2 text-base font-bold text-ink-900 drop-shadow-sm">{value}</p>
    </div>
  );
}
