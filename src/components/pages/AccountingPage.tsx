import { AccountingOverview } from "../pricing/AccountingOverview";
import { SavedQuotesPanel } from "../saved/SavedQuotesPanel";
import { Card } from "../ui/Card";
import type { Quote } from "../../types/quote";
import { sanitizeQuote } from "../../utils/quote";

interface AccountingPageProps {
  quotes: Quote[];
  currentQuoteId: string;
  onOpenQuote: (id: string) => void;
  onDuplicateQuote: (id: string) => void;
  onDeleteQuote: (id: string) => void;
}

export function AccountingPage({
  quotes,
  currentQuoteId,
  onOpenQuote,
  onDuplicateQuote,
  onDeleteQuote,
}: AccountingPageProps) {
  const normalizedQuotes = quotes.map(sanitizeQuote);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-ink-900">Muhasebe Kontrol Paneli</h2>
          <p className="mt-1 text-sm text-ink-600">
            Tamamlanan siparişlerden aylık ve toplam ciro, maliyet ve kâr özetini takip edin. İsterseniz sağ panelden ilgili teklifi açıp detay inceleyin.
          </p>
        </Card>
        <AccountingOverview quotes={normalizedQuotes} />
      </div>

      <aside>
        <SavedQuotesPanel
          currentQuoteId={currentQuoteId}
          quotes={normalizedQuotes}
          onOpen={onOpenQuote}
          onDuplicate={onDuplicateQuote}
          onDelete={onDeleteQuote}
        />
      </aside>
    </div>
  );
}
