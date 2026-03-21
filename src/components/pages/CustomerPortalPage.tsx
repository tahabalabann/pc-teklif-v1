import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { publicApi } from "../../api/publicApi";
import type { Quote } from "../../types/quote";
import { formatDisplayDate } from "../../utils/date";
import { formatCurrency } from "../../utils/money";
import { calculateGrandTotal } from "../../utils/quote";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import toast from "react-hot-toast";

export function CustomerPortalPage() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    publicApi
      .getQuote(id)
      .then((data) => setQuote(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAction = async (status: "Onaylandı" | "Reddedildi") => {
    if (!quote || !id) return;
    setSubmitting(true);
    try {
      const updated = await publicApi.updateStatus(id, status);
      setQuote(updated);
      toast.success(`Teklif başarıyla ${status.toLowerCase()}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto mt-20">
        <div className="text-red-500 mb-4">
           <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h2 className="text-xl font-bold text-ink-900 mb-2">Teklif Bulunamadı</h2>
        <p className="text-ink-500">{error || "Geçersiz veya süresi dolmuş bağlantı."}</p>
      </Card>
    );
  }

  const grandTotal = calculateGrandTotal(quote);
  
  const isPending = quote.status !== "Onaylandı" && quote.status !== "Reddedildi";

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header Info */}
      <Card className="p-6 md:p-8 mb-6 relative overflow-hidden">
        {quote.status === "Onaylandı" && <div className="absolute top-0 right-0 bg-green-500 text-white font-bold py-1 px-8 rounded-bl-xl shadow-sm">ONAYLANDI</div>}
        {quote.status === "Reddedildi" && <div className="absolute top-0 right-0 bg-red-500 text-white font-bold py-1 px-8 rounded-bl-xl shadow-sm">REDDEDİLDİ</div>}

        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <h1 className="text-2xl font-bold text-ink-900 mb-2">Teklif Detayı</h1>
            <p className="text-sm text-ink-500 font-mono">#{quote.quoteNo}</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm font-semibold text-ink-900">{quote.companyName}</p>
            <p className="text-sm text-ink-500">{formatDisplayDate(quote.date)}</p>
          </div>
        </div>

        <div className="mt-8 border-t border-ink-100 pt-6">
          <h3 className="text-sm font-semibold text-ink-900 mb-4">Müşteri Bilgileri</h3>
          <p className="text-ink-700 font-medium">{quote.customerName}</p>
        </div>
      </Card>

      {/* Items Table */}
      <Card className="overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-50/50 text-ink-600">
              <tr>
                <th className="px-6 py-4 font-semibold">ÜRÜN / HİZMET</th>
                <th className="px-6 py-4 font-semibold">AÇIKLAMA</th>
                <th className="px-6 py-4 font-semibold text-right">TOPLAM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {quote.rows.map((row) => {
                const rowTotal = Number(row.salePrice || 0);
                return (
                  <tr key={row.id} className="hover:bg-ink-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-ink-900">{row.product || "-"}</td>
                    <td className="px-6 py-4 text-ink-600">{row.description || "-"}</td>
                    <td className="px-6 py-4 text-right font-medium text-ink-900">{formatCurrency(rowTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="bg-ink-50/50 px-6 py-6 border-t border-ink-100 flex flex-col items-end space-y-3">
          {Number(quote.shipping || 0) > 0 && (
             <div className="w-full max-w-sm flex justify-between text-ink-600">
                <span>Nakliye</span>
                <span className="font-medium">{formatCurrency(Number(quote.shipping))}</span>
             </div>
          )}
          
          {Number(quote.labor || 0) > 0 && (
             <div className="w-full max-w-sm flex justify-between text-ink-600">
                <span>İşçilik</span>
                <span className="font-medium">{formatCurrency(Number(quote.labor))}</span>
             </div>
          )}
          
          {Number(quote.discount || 0) > 0 && (
             <div className="w-full max-w-sm flex justify-between text-green-600">
                <span>İndirim</span>
                <span className="font-medium">-{formatCurrency(Number(quote.discount))}</span>
             </div>
          )}

          <div className="w-full max-w-sm flex justify-between text-ink-900 text-lg font-bold border-t border-ink-200/60 pt-3 mt-1">
            <span>GENEL TOPLAM</span>
            <span className="text-orange-600">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      {isPending ? (
        <Card className="p-8 text-center bg-white shadow-elevated border-orange-100">
          <h3 className="text-xl font-bold text-ink-900 mb-2">Onay Bekleniyor</h3>
          <p className="text-ink-600 mb-6">Lütfen yukarıdaki detayları inceleyip teklif için aksiyon alın.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              variant="danger"
              className="px-8 py-3 text-lg"
              onClick={() => handleAction("Reddedildi")}
              disabled={submitting}
            >
              Teklifi Reddet
            </Button>
            <Button
              variant="primary"
              className="px-12 py-3 text-lg bg-green-500 hover:bg-green-600 text-white shadow-green-500/25"
              onClick={() => handleAction("Onaylandı")}
              disabled={submitting}
            >
              TEKLİFİ ONAYLA
            </Button>
          </div>
        </Card>
      ) : (
        <div className="text-center py-8">
           <p className="text-ink-500 text-sm">Bu teklif {quote.status.toLowerCase()} ve mühürlendi.</p>
        </div>
      )}
    </div>
  );
}
