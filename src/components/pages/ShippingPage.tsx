import { useMemo, useState } from "react";
import type { Quote } from "../../types/quote";
import { formatDateTime, formatDisplayDate } from "../../utils/date";
import { formatCurrency } from "../../utils/money";
import { calculateGrandTotal, sanitizeQuote } from "../../utils/quote";
import { GeliverShippingPanel } from "../shipping/GeliverShippingPanel";
import { SavedQuotesPanel } from "../saved/SavedQuotesPanel";
import { Card } from "../ui/Card";

interface ShippingPageProps {
  activeQuote: Quote;
  savedQuotes: Quote[];
  onPatchQuote: (patch: Partial<Quote>) => void;
  onOpenQuote: (id: string) => void;
  onDuplicateQuote: (id: string) => void;
  onDeleteQuote: (id: string) => void;
}

export function ShippingPage({
  activeQuote,
  savedQuotes,
  onPatchQuote,
  onOpenQuote,
  onDuplicateQuote,
  onDeleteQuote,
}: ShippingPageProps) {
  const normalizedSavedQuotes = savedQuotes.map(sanitizeQuote);
  const [shipmentQuery, setShipmentQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("Tümü");

  const shipmentHistory = useMemo(() => {
    return normalizedSavedQuotes
      .filter((quote) => quote.geliverShipment)
      .filter((quote) => {
        const shipment = quote.geliverShipment;
        if (!shipment) {
          return false;
        }

        const matchesQuery =
          !shipmentQuery ||
          [
            quote.customerName,
            quote.quoteNo,
            shipment.barcode,
            shipment.trackingNumber,
            shipment.providerName,
            shipment.providerServiceCode,
          ]
            .join(" ")
            .toLocaleLowerCase("tr")
            .includes(shipmentQuery.toLocaleLowerCase("tr"));

        const matchesProvider = providerFilter === "Tümü" || shipment.providerName === providerFilter;
        return matchesQuery && matchesProvider;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 12);
  }, [normalizedSavedQuotes, providerFilter, shipmentQuery]);

  const providerOptions = useMemo(() => {
    return ["Tümü", ...new Set(normalizedSavedQuotes.flatMap((quote) => (quote.geliverShipment?.providerName ? [quote.geliverShipment.providerName] : [])))];
  }, [normalizedSavedQuotes]);

  const copyToClipboard = async (value: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Best-effort helper only.
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Kargo / Aktif Teklif</p>
              <h2 className="mt-2 text-lg font-semibold text-ink-900">Aktif Teklif İçin Kargo İşlemleri</h2>
              <p className="mt-1 text-sm text-ink-600">
                Önce aktif teklifi seçin, sonra gönderici ve alıcı bilgilerini doldurup Geliver gönderisi oluşturun.
              </p>
            </div>
            <div className="rounded-2xl bg-brand-50 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.14em] text-brand-600">Aktif Teklif</p>
              <p className="mt-1 text-lg font-bold text-ink-900">{activeQuote.quoteNo}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <Info label="Müşteri" value={activeQuote.customerName || "-"} />
            <Info label="Firma" value={activeQuote.companyName || "-"} />
            <Info label="Tarih" value={formatDisplayDate(activeQuote.date)} />
            <Info label="Toplam" value={formatCurrency(calculateGrandTotal(activeQuote))} />
          </div>
        </Card>

        <GeliverShippingPanel quote={activeQuote} onChange={onPatchQuote} />

        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-ink-900">Kargo Geçmişi</h3>
              <p className="mt-1 text-sm text-ink-600">
                Son oluşturulan gönderileri barkod, takip ve kargo firmasıyla hızlıca takip edin.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <input
              className="field"
              placeholder="Müşteri, teklif no, barkod veya takip ara"
              value={shipmentQuery}
              onChange={(event) => setShipmentQuery(event.target.value)}
            />
            <select className="field" value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}>
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          {shipmentHistory.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-5 text-sm text-ink-500">
              Filtreye uygun oluşturulmuş bir Geliver gönderisi yok.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {shipmentHistory.map((quote) => (
                <div key={quote.id} className="rounded-2xl border border-ink-200 bg-white/90 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-900">{quote.customerName || "Adsız Müşteri"}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">{quote.quoteNo}</p>
                    </div>
                    <button
                      className="rounded-xl bg-ink-900 px-3 py-2 text-xs font-semibold text-white"
                      onClick={() => onOpenQuote(quote.id)}
                      type="button"
                    >
                      Teklifi Aç
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-ink-600 md:grid-cols-2">
                    <p>Kargo: {quote.geliverShipment?.providerName || "-"} / {quote.geliverShipment?.providerServiceCode || "-"}</p>
                    <p>Takip: {quote.geliverShipment?.trackingNumber || "-"}</p>
                    <p>Barkod: {quote.geliverShipment?.barcode || "-"}</p>
                    <p>Tutar: {formatCurrency(quote.geliverShipment?.shipmentPrice || quote.shipping || 0)}</p>
                    <p>Durum: {quote.geliverShipment?.status || "-"}</p>
                    <p>Güncelleme: {formatDateTime(quote.updatedAt)}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!!quote.geliverShipment?.barcode && (
                      <button
                        className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink-700 ring-1 ring-inset ring-ink-200"
                        onClick={() => void copyToClipboard(quote.geliverShipment?.barcode || "")}
                        type="button"
                      >
                        Barkodu Kopyala
                      </button>
                    )}
                    {!!quote.geliverShipment?.trackingNumber && (
                      <button
                        className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink-700 ring-1 ring-inset ring-ink-200"
                        onClick={() => void copyToClipboard(quote.geliverShipment?.trackingNumber || "")}
                        type="button"
                      >
                        Takibi Kopyala
                      </button>
                    )}
                    {!!quote.geliverShipment?.labelUrl && (
                      <a
                        className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                        href={quote.geliverShipment.labelUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Etiketi Aç
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
