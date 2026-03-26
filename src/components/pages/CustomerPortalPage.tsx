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

  const [customerNote, setCustomerNote] = useState("");

  const handleAction = async (status: "Onaylandı" | "Reddedildi") => {
    if (!quote || !id) return;
    setSubmitting(true);
    try {
      const updated = await publicApi.updateStatus(id, status, customerNote);
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
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-0">
      {/* Header Info */}
      <Card className="p-6 md:p-8 mb-6 relative overflow-hidden border-none shadow-premium-soft">
        {quote.status === "Onaylandı" && <div className="absolute top-0 right-0 bg-green-500 text-white font-bold py-1 px-8 rounded-bl-xl shadow-sm z-10">ONAYLANDI</div>}
        {quote.status === "Reddedildi" && <div className="absolute top-0 right-0 bg-red-500 text-white font-bold py-1 px-8 rounded-bl-xl shadow-sm z-10">REDDEDİLDİ</div>}

        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-ink-900 mb-2 tracking-tight">Teklif Detayı</h1>
            <p className="text-sm text-ink-500 font-mono bg-ink-50 px-2 py-0.5 rounded inline-block">#{quote.quoteNo}</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-lg font-bold text-ink-900">{quote.companyName}</p>
            <p className="text-sm text-ink-500">{formatDisplayDate(quote.date)}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-ink-100 pt-8">
          <div>
             <h3 className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">Müşteri Bilgileri</h3>
             <p className="text-ink-900 font-bold text-lg leading-tight">{quote.customerName}</p>
          </div>
          {!isPending && (quote.customerApprovedAt || quote.customerRejectedAt) && (
             <div className="bg-ink-50 p-4 rounded-xl border border-ink-100/50">
                <h3 className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">İşlem Özeti</h3>
                <p className="text-ink-700 text-sm font-medium">
                   {quote.status === "Onaylandı" ? "Onay Tarihi: " : "Red Tarihi: "}
                   <span className="text-ink-900 font-bold">{formatDisplayDate(quote.customerApprovedAt || quote.customerRejectedAt || "")}</span>
                </p>
                {quote.customerNote && (
                   <div className="mt-3 bg-white p-3 rounded-lg border border-ink-100 italic text-ink-600 text-sm">
                      "{quote.customerNote}"
                   </div>
                )}
             </div>
          )}
        </div>
      </Card>

      {/* Items Table */}
      <Card className="overflow-hidden mb-6 border-none shadow-premium-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-ink-900 text-white">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs w-16 text-center">GÖRSEL</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">ÜRÜN / HİZMET</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">AÇIKLAMA</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">TOPLAM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {quote.rows.map((row) => {
                const rowTotal = Number(row.salePrice || 0);
                return (
                  <tr key={row.id} className="hover:bg-ink-50/50 transition-all duration-200">
                    <td className="px-6 py-4 text-center">
                      {row.imageUrl ? (
                        <img src={row.imageUrl} alt="" className="h-10 w-10 object-contain rounded border border-ink-100 bg-white mx-auto shadow-sm" />
                      ) : (
                        <div className="h-10 w-10 bg-ink-50 rounded border border-ink-100 mx-auto flex items-center justify-center text-ink-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 font-bold text-ink-900">{row.product || "-"}</td>
                    <td className="px-6 py-5 text-ink-500">{row.description || "-"}</td>
                    <td className="px-6 py-5 text-right font-extrabold text-ink-900">{formatCurrency(rowTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="bg-ink-50/30 px-6 py-8 border-t border-ink-100 flex flex-col items-end space-y-4">
          {Number(quote.shipping || 0) > 0 && (
             <div className="w-full max-w-sm flex justify-between text-ink-500 font-medium">
                <span>Nakliye</span>
                <span className="text-ink-900">{formatCurrency(Number(quote.shipping))}</span>
             </div>
          )}
          
          {Number(quote.labor || 0) > 0 && (
             <div className="w-full max-w-sm flex justify-between text-ink-500 font-medium">
                <span>İşçilik</span>
                <span className="text-ink-900">{formatCurrency(Number(quote.labor))}</span>
             </div>
          )}
          
          {Number(quote.discount || 0) > 0 && (
             <div className="w-full max-w-sm flex justify-between text-green-600 font-medium">
                <span>İndirim</span>
                <span className="font-bold">-{formatCurrency(Number(quote.discount))}</span>
             </div>
          )}

          <div className="w-full max-w-sm flex justify-between text-ink-900 text-2xl font-black border-t-2 border-orange-500/20 pt-5 mt-2">
            <span className="tracking-tight">TOPLAM</span>
            <span className="text-orange-600 tracking-tighter">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      {isPending ? (
        <Card className="p-8 sm:p-12 text-center bg-white shadow-premium-elevated border-2 border-orange-500/10">
          <div className="max-w-xl mx-auto">
            <h3 className="text-2xl font-black text-ink-900 mb-4 tracking-tight uppercase">Teklif Onayı Bekleniyor</h3>
            <p className="text-ink-500 mb-8 leading-relaxed">
              Lütfen yukarıdaki detayları inceleyin. Teklifi onaylarken veya reddederken 
              bir not bırakabilirsiniz.
            </p>

            <div className="mb-8 text-left">
              <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2 ml-1">İşlem Notu (Opsiyonel)</label>
              <textarea 
                className="w-full h-32 p-4 rounded-xl border border-ink-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none resize-none text-ink-900 font-medium"
                placeholder="Örn: Ödeme haftaya Pazartesi yapılacak, kargo tarihini teyit eder misiniz?"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                variant="danger"
                className="px-8 py-4 text-lg font-bold rounded-xl shadow-lg shadow-red-500/10 active:scale-95 transition-transform"
                onClick={() => handleAction("Reddedildi")}
                disabled={submitting}
              >
                Teklifi Reddet
              </Button>
              <Button
                variant="primary"
                className="px-16 py-4 text-lg font-black rounded-xl bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/20 active:scale-95 transition-transform border-none"
                onClick={() => handleAction("Onaylandı")}
                disabled={submitting}
              >
                ŞİMDİ ONAYLA
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="text-center py-12 bg-white/50 rounded-3xl border border-ink-100 backdrop-blur-sm shadow-premium-soft">
           <div className={`inline-flex items-center justify-center p-3 rounded-full mb-4 ${quote.status === "Onaylandı" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
             {quote.status === "Onaylandı" ? (
               <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
             ) : (
               <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
             )}
           </div>
           <p className="text-ink-900 font-bold text-xl mb-1">Teklif İşlendi</p>
           <p className="text-ink-500">Bu teklif başarılı bir şekilde <strong>{quote.status.toLowerCase()}</strong> olarak işaretlendi. Teşekkür ederiz.</p>
        </div>
      )}

      {/* Footer / Contact */}
      <div className="mt-12 text-center pb-12">
         <div className="inline-flex items-center gap-2 mb-4 bg-ink-900 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            <span>Destek & Bilgi İçin Satıcı ile İletişime Geçin</span>
         </div>
         <p className="text-xs text-ink-400 font-medium">Bu teklif {quote.companyName} tarafından oluşturulmuştur.</p>
      </div>
    </div>
  );
}
