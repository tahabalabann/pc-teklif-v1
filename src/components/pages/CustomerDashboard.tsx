import { useEffect, useState } from "react";
import { 
  RocketLaunchIcon, 
  CpuChipIcon, 
  ClockIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowTopRightOnSquareIcon
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";
import { quotesApi } from "../../utils/api";
import type { Quote } from "../../types/quote";
import { formatCurrency } from "../../utils/money";

export function CustomerDashboard() {
  const user = useAppStore((state) => state.session?.user);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await quotesApi.list();
      setQuotes(data);
    } catch (err) {
      console.error("Failed to load quotes:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome Hero */}
      <section className="relative p-8 rounded-[2.5rem] bg-slate-900 overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="w-20 h-20 bg-amber-500 rounded-3xl flex items-center justify-center shadow-xl shadow-amber-500/20 shrink-0">
            <RocketLaunchIcon className="w-12 h-12 text-black" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-white tracking-tight">Merhaba, {user?.name}!</h1>
            <p className="text-slate-400 mt-2 text-lg">PC Teklif dünyasına hoş geldin. Bugün nasıl bir performans canavarı tasarlıyoruz?</p>
          </div>
          <Link 
            to="/builder" 
            className="px-8 py-4 bg-amber-500 text-black rounded-full font-bold text-lg hover:scale-105 transition-all shadow-lg shadow-amber-500/10"
          >
            Sistem Toplamaya Başla
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Builds / Quotes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ClockIcon className="w-6 h-6 text-amber-500" />
              Son Talepleriniz
            </h2>
            <span className="text-sm text-slate-500">Tümünü Gör</span>
          </div>

          {loading ? (
            <div className="bg-white/5 border border-white/5 rounded-3xl p-12 text-center animate-pulse">
              <p className="text-slate-500">Talepleriniz yükleniyor...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="bg-white/5 border border-white/5 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CpuChipIcon className="w-8 h-8 text-slate-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-400">Henüz bir talebiniz bulunmuyor.</h3>
              <p className="text-slate-500 mt-2">Sihirbazı kullanarak ilk sistem yapılandırmanızı oluşturabilirsiniz.</p>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Teklif No</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Tarih</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Durum</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Tutar</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {quotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-amber-500 font-bold">{quote.quoteNo}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{quote.date}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            quote.status === "Onaylandı" ? "bg-emerald-500/20 text-emerald-500" :
                            quote.status === "Reddedildi" ? "bg-red-500/20 text-red-500" :
                            "bg-amber-500/20 text-amber-500"
                          }`}>
                            {quote.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-right">{formatCurrency(quote.salesPrice)}</td>
                        <td className="px-6 py-4 text-right">
                          <Link 
                            to={`/portal/quote/${quote.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-amber-500 hover:text-black rounded-lg text-xs font-bold transition-all"
                          >
                            Görüntüle
                            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Support & Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-amber-500" />
            Destek & Yardım
          </h2>
          
          <div className="bg-gradient-to-br from-slate-900 to-black p-6 rounded-3xl border border-white/5">
            <h3 className="font-bold mb-4">Uzman Desteği</h3>
            <p className="text-sm text-slate-400 mb-6">Sistem toplama konusunda yardıma mı ihtiyacınız var? Teknik ekibimiz her zaman yanınızda.</p>
            <button className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold hover:bg-white/10 transition-all">
              Bize Ulaşın
            </button>
          </div>

          <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10">
            <h4 className="text-amber-500 font-bold text-sm mb-2 uppercase tracking-wider">Hızlı İpucu</h4>
            <p className="text-sm text-slate-400 italic font-medium">
              "İşlemci seçiminde çekirdek hızı kadar önbellek (Cache) miktarı da oyun performansını doğrudan etkiler."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
