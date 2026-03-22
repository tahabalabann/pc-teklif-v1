import type { PrintTemplateMode, Quote } from "../../types/quote";
import { formatDisplayDate } from "../../utils/date";
import { formatCurrency, formatSecondaryCurrency } from "../../utils/money";
import { calculateGrandTotal, calculatePartsTotal } from "../../utils/quote";

interface PrintQuoteDocumentProps {
  quote: Quote;
  showItemPrices: boolean;
  printTemplate: PrintTemplateMode;
}

export function PrintQuoteDocument({ quote, showItemPrices, printTemplate }: PrintQuoteDocumentProps) {
  const visibleRows = quote.rows.filter((row) => row.product || row.description || row.salePrice > 0);
  const partsTotal = calculatePartsTotal(quote.rows);
  const grandTotal = calculateGrandTotal(quote);
  const onlyProducts = printTemplate === "products";
  const shippingFocused = printTemplate === "shipping";
  const proforma = printTemplate === "proforma";
  const shouldShowPrices = showItemPrices && printTemplate !== "products";
  const sec = (val: number) => formatSecondaryCurrency(val, quote.currency, quote.exchangeRate);

  return (
    <section className="print-document">
      <header className="print-header">
        <div>
          <p className="print-eyebrow">
            {proforma ? "Resmi Proforma Teklif" : shippingFocused ? "Kargo Dahil Teklif" : "Bilgisayar Sistem Teklifi"}
          </p>
          <h1 className="print-title">{quote.companyName || "PC Teklif Sistemi"}</h1>
          {!onlyProducts && (
            <p className="print-muted whitespace-pre-line">
              {quote.sellerInfo || "İletişim bilgisi eklenmedi."}
            </p>
          )}
        </div>

        <div className="print-meta-card">
          <div className="print-meta-row">
            <span>Teklif No</span>
            <strong>{quote.quoteNo}</strong>
          </div>
          <div className="print-meta-row">
            <span>Tarih</span>
            <strong>{formatDisplayDate(quote.date)}</strong>
          </div>
          <div className="print-meta-row">
            <span>Müşteri</span>
            <strong>{quote.customerName || "-"}</strong>
          </div>
          <div className="print-meta-row">
            <span>Durum</span>
            <strong>{quote.status}</strong>
          </div>
          {quote.geliverShipment?.providerName && (
            <div className="print-meta-row">
              <span>Kargo Firması</span>
              <strong>
                {quote.geliverShipment.providerName} / {quote.geliverShipment.providerServiceCode}
              </strong>
            </div>
          )}
          {quote.geliverShipment?.agreementText && (
            <div className="print-meta-row">
              <span>Kargo Anlaşması</span>
              <strong>{quote.geliverShipment.agreementText}</strong>
            </div>
          )}
          {quote.geliverShipment?.barcode && (
            <div className="print-meta-row">
              <span>Kargo Barkod No</span>
              <strong>{quote.geliverShipment.barcode}</strong>
            </div>
          )}
        </div>
      </header>

      <section className="print-section">
        <div className="print-section-head">
          <h2>{onlyProducts ? "Ürün Listesi" : "Sistem Parçaları"}</h2>
          <span>
            {shouldShowPrices ? `${visibleRows.length} kalem` : onlyProducts ? "Sade görünüm" : "Toplu fiyat görünümü"}
          </span>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Ürün / Model</th>
              <th>Açıklama</th>
              {shouldShowPrices && <th className="text-right">Fiyat</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={shouldShowPrices ? 4 : 3} className="print-empty">
                  Henüz sistem parçası eklenmedi.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.category}</td>
                  <td>{row.product || "-"}</td>
                  <td>{row.description || "-"}</td>
                  {shouldShowPrices && (
                    <td className="text-right">
                      <div className="font-semibold text-ink-900">{formatCurrency(row.salePrice, quote.currency)}</div>
                      {sec(row.salePrice) && (
                        <div className="text-[10px] text-ink-500 font-normal mt-0.5">{sec(row.salePrice)}</div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {!onlyProducts && (
        <section className="print-grid">
          <div className="print-note-card">
            {!shippingFocused && (
              <>
                <h3>Notlar</h3>
                <p>{quote.notes || "Belirtilmiş ek not bulunmuyor."}</p>
                <h3>Garanti / Test</h3>
                <p>{quote.warrantyInfo || "Bilgi girilmedi."}</p>
              </>
            )}
            {quote.geliverShipment && (
              <>
                <h3>Kargo Bilgisi</h3>
                <p>
                  {quote.geliverShipment.providerName
                    ? `${quote.geliverShipment.providerName} / ${quote.geliverShipment.providerServiceCode}`
                    : "Geliver gönderisi oluşturuldu."}
                  {"\n"}
                  {quote.geliverShipment.agreementText || "Anlaşma bilgisi bulunmuyor."}
                  {"\n"}Takip No: {quote.geliverShipment.trackingNumber || "-"}
                  {"\n"}Barkod No: {quote.geliverShipment.barcode || "-"}
                </p>
              </>
            )}
          </div>

          <div className="print-summary-card">
            <div className="print-summary-row">
              <span>Parça Toplamı</span>
              <strong>{formatCurrency(partsTotal, quote.currency)}</strong>
            </div>
            {!onlyProducts && (
              <>
                <div className="print-summary-row">
                  <span>İşçilik / Montaj</span>
                  <strong>{formatCurrency(quote.labor, quote.currency)}</strong>
                </div>
                <div className="print-summary-row">
                  <span>Kargo</span>
                  <strong>{formatCurrency(quote.shipping, quote.currency)}</strong>
                </div>
                <div className="print-summary-row">
                  <span>İndirim</span>
                  <strong>-{formatCurrency(quote.discount, quote.currency)}</strong>
                </div>
              </>
            )}
            <div className="print-summary-total">
              <span>{onlyProducts ? "Parça Genel Toplamı" : "Genel Toplam"}</span>
              <div className="text-right">
                <strong>{formatCurrency(grandTotal, quote.currency)}</strong>
                {sec(grandTotal) && (
                  <div className="text-xs text-ink-500 font-normal mt-1">
                    {quote.currency === "TRY" ? "USD" : "TL"} Karşılığı: {sec(grandTotal)}
                  </div>
                )}
              </div>
            </div>
            {quote.cashPrice > 0 && (
              <div className="print-summary-row print-summary-secondary">
                <span>Nakit Fiyat</span>
                <strong>{formatCurrency(quote.cashPrice, quote.currency)}</strong>
              </div>
            )}
            {quote.tradePrice > 0 && (
              <div className="print-summary-row print-summary-secondary">
                <span>Takas Fiyatı</span>
                <strong>{formatCurrency(quote.tradePrice, quote.currency)}</strong>
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="print-footer">
        <span>Bu belge otomatik olarak teklif sistemi üzerinden oluşturuldu.</span>
        <span>{quote.companyName || "PC Teklif Sistemi"}</span>
      </footer>
    </section>
  );
}
