import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import type { FrontendFeaturedSystem } from "../../types/storefront";
import { 
  CpuChipIcon, 
  ShieldCheckIcon, 
  TruckIcon,
  ChevronRightIcon,
  WrenchScrewdriverIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

export const LandingPage = () => {
  const [featuredSystems, setFeaturedSystems] = useState<FrontendFeaturedSystem[]>([]);
  const [loadingSystems, setLoadingSystems] = useState(true);

  useEffect(() => {
    fetch("/api/public/storefront/featured-systems")
      .then(res => res.json())
      .then(data => {
         const parsed = (data.systems || []).map((s: any) => ({
           ...s,
           specs: JSON.parse(s.specs || "[]")
         }));
         setFeaturedSystems(parsed);
      })
      .catch(err => console.error("Vitrin yüklenemedi", err))
      .finally(() => setLoadingSystems(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-brand-500/30 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <CpuChipIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              PC Teklif
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#systems" className="hover:text-blue-400 transition-colors">Bilgisayarlar</a>
            <Link to="/builder" className="hover:text-blue-400 transition-colors">Sistem Topla</Link>
            <a href="#process" className="hover:text-blue-400 transition-colors">Hizmetlerimiz</a>
            <a href="#" className="hover:text-blue-400 transition-colors">Destek</a>
          </div>

          <Link 
            to="/login" 
            className="px-5 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm font-semibold border border-slate-700"
          >
            Yönetim Paneli
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-start text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Stoktan Hızlı Teslimat
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-white leading-tight">
              Yüksek Performanslı <br />
              Özel Kurulum PC'ler
            </h1>
            <p className="text-slate-400 text-lg mb-8 max-w-lg leading-relaxed">
              Oyun, yayıncılık ve iş istasyonları için uzman mühendisler tarafından test edilmiş hazır sistemler veya tamamen ihtiyaçlarınıza göre özelleştirebileceğiniz donanımlar.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link to="/builder" className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 text-white rounded-md text-sm font-bold transition-all hover:bg-blue-500 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                Sistem Topla
                <ChevronRightIcon className="w-4 h-4" />
              </Link>
              <a href="#systems" className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 text-sm font-bold transition-all flex items-center justify-center">
                Hazır Sistemler
              </a>
            </div>

            <div className="mt-10 flex items-center gap-8 border-t border-slate-800 pt-6 w-full">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="w-6 h-6 text-slate-500" />
                <div className="text-sm">
                  <p className="font-semibold text-white">2 Yıl Garanti</p>
                  <p className="text-slate-500">Birebir Değişim</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <WrenchScrewdriverIcon className="w-6 h-6 text-slate-500" />
                <div className="text-sm">
                  <p className="font-semibold text-white">Ücretsiz Montaj</p>
                  <p className="text-slate-500">Özenli Kurulum</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full"></div>
            <img 
              src="/hero_pc.png" 
              alt="High-end Gaming PC Case" 
              className="relative z-10 w-full h-auto object-contain rounded-2xl shadow-2xl border border-slate-800 bg-slate-900"
              style={{ maxHeight: '600px' }}
            />
          </motion.div>
        </div>
      </section>

      {/* Featured Systems Grid */}
      <section id="systems" className="py-24 px-6 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-bold mb-3 text-white">Performans Odaklı Hazır Sistemler</h2>
              <p className="text-slate-400">Uyumluluk testleri tamamlanmış, tak-çalıştır oyun ve iş makineleri.</p>
            </div>
            <Link to="/products" className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors text-sm whitespace-nowrap">
              Tüm Kataloğu Gör <ChevronRightIcon className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingSystems ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl h-[400px] animate-pulse"></div>
              ))
            ) : featuredSystems.length > 0 ? (
               featuredSystems.map((system) => (
              <motion.div 
                key={system.id} 
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors flex flex-col"
              >
                <div className="p-6 pb-0 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-900 px-2 py-1 rounded">{system.category || "Sistem"}</span>
                    {system.badge && (
                      <span className="text-xs font-bold text-white bg-blue-600 px-2 py-1 rounded">{system.badge}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">{system.name}</h3>
                  <ul className="space-y-3 mb-6">
                    {system.specs.map((spec, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                        {spec}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-6 pt-4 border-t border-slate-800 bg-slate-900/50">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-white">{system.price} ₺</span>
                  </div>
                  <Link to="/builder" className="w-full flex justify-center py-2.5 rounded-md bg-white text-slate-900 font-bold hover:bg-slate-200 transition-colors text-sm">
                    İncele ve Özelleştir
                  </Link>
                </div>
              </motion.div>
            ))) : (
               <div className="col-span-full py-12 text-center text-slate-500">Hazır sistemler yakında eklenecektir.</div>
            )}
          </div>
        </div>
      </section>

      {/* Process Map */}
      <section id="process" className="py-24 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 text-white">Sipariş İşleyişi</h2>
            <p className="text-slate-400">Ürününüzün sipariş aşamasından kargoya kadar geçen şeffaf süreçlerini inceleyin.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: CpuChipIcon, 
                title: "Parça Seçimi", 
                desc: "Sistem toplama aracımız uyumsuzlukları engeller. Güvenle seçiminizi yapın." 
              },
              { 
                icon: ClockIcon, 
                title: "Uzman Onayı", 
                desc: "Teklifiniz mühendislerimiz tarafından incelenip en iyi fiyat onaylanarak size iletilir." 
              },
              { 
                icon: WrenchScrewdriverIcon, 
                title: "Profesyonel Montaj", 
                desc: "Ödeme sonrası kablolama ve montaj uzman ekibimizce özenle tamamlanır." 
              },
              { 
                icon: TruckIcon, 
                title: "Hızlı Kargo", 
                desc: "Ürün streçlenip darbelere karşı zırhlanarak 2 iş günü içinde yola çıkar." 
              }
            ].map((step, i) => (
              <div key={i} className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-5">
                  <step.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-6 bg-slate-900 border-t border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 text-white">Hazırsanız Başlayalım mı?</h2>
            <p className="text-slate-400 text-lg mb-8">Hemen şimdi PC Toplama sihirbazını kullanarak fiyat teklifinizi oluşturabilirsiniz.</p>
            <Link to="/builder" className="inline-flex px-8 py-3.5 bg-blue-600 text-white rounded-md text-sm font-bold transition-all hover:bg-blue-500 shadow-lg shadow-blue-500/20">
               Sistem Topla
            </Link>
        </div>
      </section>

      {/* Footer Mini */}
      <footer className="py-8 px-6 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <CpuChipIcon className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-bold text-slate-500">PC Teklif A.Ş.</span>
          </div>
          <div className="flex gap-6 text-slate-500 text-sm">
            <a href="#" className="hover:text-slate-300">İletişim</a>
            <a href="#" className="hover:text-slate-300">Mesafeli Satış Sözleşmesi</a>
            <a href="#" className="hover:text-slate-300">Garanti Şartları</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
