import type { CompanyRecord, Quote } from "../../types/quote";
import { formatDateTime } from "../../utils/date";
import { TeamManagementPanel } from "../team/TeamManagementPanel";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface CompaniesPageProps {
  quote: Quote;
  quotes: Quote[];
  onApplyCompany: (company: CompanyRecord) => void;
  onOpenQuote: (id: string) => void;
}

export function CompaniesPage({ quote, quotes, onApplyCompany, onOpenQuote }: CompaniesPageProps) {
  const relatedQuotes = quotes
    .filter(
      (item) =>
        !!quote.companyName &&
        (item.companyName === quote.companyName || item.customerName === quote.customerName),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Adres Defteri / Rehber</p>
        <h2 className="mt-2 text-lg font-semibold text-ink-900">Adres Defteri</h2>
        <p className="mt-1 text-sm text-ink-600">
          Tedarikçilerinizi, müşterilerinizi ve iş ortaklarınızı kaydedin. İletişim ve vergi bilgilerini saklayın, tekliflerinize hızla uygulayın.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <TeamManagementPanel quote={quote} onApplyCompany={onApplyCompany} />

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-base font-semibold text-ink-900">Aktif Firma Özeti</h3>
            <div className="mt-4 space-y-3 text-sm text-ink-600">
              <p>
                <span className="font-medium text-ink-900">Firma:</span> {quote.companyName || "-"}
              </p>
              <p>
                <span className="font-medium text-ink-900">Müşteri:</span> {quote.customerName || "-"}
              </p>
              <p>
                <span className="font-medium text-ink-900">İletişim:</span> {quote.geliverRecipient.phone || "-"}
              </p>
              <p className="whitespace-pre-line">
                <span className="font-medium text-ink-900">Adres:</span>{" "}
                {quote.geliverRecipient.address1 || "Henüz aktif teklife firma adresi uygulanmadı."}
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold text-ink-900">Son Teklifler</h3>
            <p className="mt-1 text-sm text-ink-600">
              Bu kişi veya firmayla ilişkilendirilen son teklifler burada görünür.
            </p>

            {relatedQuotes.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-4 text-sm text-ink-500">
                Bu firmaya bağlı kayıtlı teklif bulunamadı.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {relatedQuotes.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-ink-200 bg-white/90 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-ink-900">{item.quoteNo}</p>
                          {item.companyName && (
                            <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700">
                              {item.companyName}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-ink-600">{item.customerName || item.companyName}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">
                          {item.status} • {formatDateTime(item.updatedAt)}
                        </p>
                      </div>
                      <Button onClick={() => onOpenQuote(item.id)} type="button" variant="secondary">
                        Aç
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
