import type { Quote } from "../../types/quote";
import { formatDisplayDate } from "../../utils/date";
import { formatCurrency } from "../../utils/money";
import { calculateGrandTotal, calculatePartsTotal } from "../../utils/quote";

interface PrintQuoteDocumentProps {
  quote: Quote;
  showItemPrices: boolean;
}

export function PrintQuoteDocument({ quote, showItemPrices }: PrintQuoteDocumentProps) {
  const visibleRows = quote.rows.filter((row) => row.product || row.description || row.salePrice > 0);
  const partsTotal = calculatePartsTotal(quote.rows);
  const grandTotal = calculateGrandTotal(quote);

  return (
    <section className="print-document">
      <header className="print-header">
        <div>
          <p className="print-eyebrow">Bilgisayar Sistem Teklifi</p>
          <h1 className="print-title">{quote.companyName || "PC Teklif Sistemi"}</h1>
          <p className="print-muted whitespace-pre-line">{quote.sellerInfo || "İletişim bilgisi eklenmedi."}</p>
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
          <h2>Sistem Parçaları</h2>
          <span>{showItemPrices ? `${visibleRows.length} kalem` : "Toplu fiyat görünümü"}</span>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Ürün / Model</th>
              <th>Açıklama</th>
              {showItemPrices && <th className="text-right">Fiyat</th>}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={showItemPrices ? 4 : 3} className="print-empty">
                  Henüz sistem parçası eklenmedi.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.category}</td>
                  <td>{row.product || "-"}</td>
                  <td>{row.description || "-"}</td>
                  {showItemPrices && <td className="text-right font-semibold">{formatCurrency(row.salePrice)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="print-grid">
        <div className="print-note-card">
          <h3>Notlar</h3>
          <p>{quote.notes || "Belirtilmiş ek not bulunmuyor."}</p>
          <h3>Garanti / Test</h3>
          <p>{quote.warrantyInfo || "Bilgi girilmedi."}</p>
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
            <strong>{formatCurrency(partsTotal)}</strong>
          </div>
          <div className="print-summary-row">
            <span>İşçilik / Montaj</span>
            <strong>{formatCurrency(quote.labor)}</strong>
          </div>
          <div className="print-summary-row">
            <span>Kargo</span>
            <strong>{formatCurrency(quote.shipping)}</strong>
          </div>
          <div className="print-summary-row">
            <span>İndirim</span>
            <strong>-{formatCurrency(quote.discount)}</strong>
          </div>
          <div className="print-summary-total">
            <span>Genel Toplam</span>
            <strong>{formatCurrency(grandTotal)}</strong>
          </div>
          {quote.cashPrice > 0 && (
            <div className="print-summary-row print-summary-secondary">
              <span>Nakit Fiyat</span>
              <strong>{formatCurrency(quote.cashPrice)}</strong>
            </div>
          )}
          {quote.tradePrice > 0 && (
            <div className="print-summary-row print-summary-secondary">
              <span>Takas Fiyatı</span>
              <strong>{formatCurrency(quote.tradePrice)}</strong>
            </div>
          )}
        </div>
      </section>

      <footer className="print-footer">
        <span>Bu belge otomatik olarak teklif sistemi üzerinden oluşturuldu.</span>
        <span>{quote.companyName || "PC Teklif Sistemi"}</span>
      </footer>
    </section>
  );
}
