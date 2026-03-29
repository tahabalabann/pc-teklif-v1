import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  RocketLaunchIcon, 
  CpuChipIcon, 
  ShieldCheckIcon, 
  TruckIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";

export const LandingPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 selection:bg-white/20 font-sans">
      {/* Navigation Overlay */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 px-0.5 rounded-full flex items-center justify-center bg-white/5 border border-white/10">
              <CpuChipIcon className="w-5 h-5 text-white/90" />
            </div>
            <span className="text-lg font-medium tracking-tight text-white">
              PC Teklif
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-10 text-sm font-light text-slate-400">
            <a href="#systems" className="hover:text-white transition-colors duration-300">Hazır Sistemler</a>
            <Link to="/builder" className="hover:text-white transition-colors duration-300">Sistem Topla</Link>
            <a href="#process" className="hover:text-white transition-colors duration-300">Nasıl Çalışır?</a>
          </div>

          <Link 
            to="/quotes" 
            className="px-6 py-2 rounded-full bg-white text-black hover:bg-slate-200 transition-colors text-sm font-medium"
          >
            Yönetim Paneli
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-44 pb-24 px-6 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
        {/* Very subtle background light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full -z-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-zinc-600/10 blur-[130px] rounded-full mix-blend-screen"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 mb-8 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Yeni Nesil Performans
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-medium mb-8 leading-[1.05] tracking-tighter text-white">
              Sınırlarını <br className="hidden md:block" />
              <span className="text-white/40">Sen Belirle.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl mb-14 font-light leading-relaxed">
              Hayalindeki mimari eseri bilgisayarı tüm detaylarıyla tasarla. 
              Sana özel konfigürasyonlarla performansın zirvesine ulaş.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/builder" className="group relative px-8 py-3.5 bg-white text-black rounded-full text-sm font-medium transition-all hover:scale-[1.02] hover:bg-slate-100 flex items-center gap-2">
                Sistemini Topla
                <ChevronRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
              
              <a href="#systems" className="px-8 py-3.5 rounded-full bg-transparent border border-white/20 text-white hover:bg-white/5 text-sm font-medium transition-all">
                Hazır Sistemler
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Systems */}
      <section id="systems" className="py-32 px-6 bg-transparent border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-medium mb-4 tracking-tight text-white">Efsanevi Yapılandırmalar</h2>
              <p className="text-slate-400 font-light text-lg">Mühendislerimiz tarafından optimize edilmiş, kutudan çıktığı anda performansa hazır sistemler.</p>
            </div>
            <button className="text-slate-400 hover:text-white font-medium flex items-center gap-2 transition-colors text-sm">
              Tüm Kataloğu İncele
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {[
              { 
                name: "Apex Vanguard", 
                tag: "Giriş Seviyesi", 
                price: "24.900 TL", 
                specs: ["RTX 4060", "Ryzen 5 7500F", "16GB DDR5 5600MHz"],
                accent: "group-hover:text-white"
              },
              { 
                name: "Nova Prime", 
                tag: "Orta Segment", 
                price: "42.500 TL", 
                specs: ["RTX 4070 Super", "i7-14700K", "32GB DDR5 6000MHz"],
                accent: "group-hover:text-white"
              },
              { 
                name: "Titan Eternal", 
                tag: "Extreme Performance", 
                price: "115.000 TL", 
                specs: ["RTX 4090", "Ryzen 9 7950X3D", "64GB DDR5 6400MHz"],
                accent: "group-hover:text-white"
              }
            ].map((system, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                className="group relative p-8 rounded-3xl bg-zinc-900/30 border border-white/10 hover:border-white/20 hover:bg-zinc-900/50 transition-all duration-500 overflow-hidden flex flex-col"
              >
                {/* Subtle top spotlight on hover */}
                <div className="absolute top-0 inset-x-0 h-px w-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <span className="block mb-5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{system.tag}</span>
                <h3 className="text-2xl font-medium mb-8 text-white">{system.name}</h3>
                
                <div className="space-y-4 mb-12 flex-1">
                  {system.specs.map((spec, j) => (
                    <div key={j} className="flex items-center gap-4 text-sm text-slate-400 font-light group-hover:text-slate-300 transition-colors cursor-default">
                      <CpuChipIcon className={`w-4 h-4 text-slate-600 transition-colors duration-500 ${system.accent}`} />
                      {spec}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <span className="text-xl font-light text-white tracking-tight">{system.price}</span>
                  <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black group-hover:border-transparent transition-all duration-300">
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-32 px-6 border-t border-white/5 bg-zinc-950/20">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-24">
            <h2 className="text-3xl md:text-4xl font-medium mb-6 tracking-tight text-white">Hayalinden Kapına</h2>
            <p className="text-slate-400 font-light text-lg">Sadece birkaç adımda uzman mühendislerimiz tarafından toplanıp test edilmiş profesyonel sisteminize kavuşun.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-8">
            {[
              { icon: RocketLaunchIcon, title: "1. Keşfet", desc: "Sihirbazla hayalindeki parçaları seç veya efsanevi hazır sistemlerimizden birini beğen." },
              { icon: CpuChipIcon, title: "2. Tasarla", desc: "Uzmanlarımız seçtiğin parçaların uyumluluğunu test eder ve sana özel net bir fiyat teklifi sunar." },
              { icon: ShieldCheckIcon, title: "3. Onayla", desc: "Müşteri portalı üzerinden sana gönderilen dijital faturanı incele ve tek tıkla onayla." },
              { icon: TruckIcon, title: "4. Teslimat", desc: "Sistemin profesyonelce birleştirilir, stres testlerinden geçer ve özenle adresine kargolanır." }
            ].map((step, i) => (
              <div key={i} className="group relative">
                {/* Connecting Line (for desktop) */}
                {i < 3 && <div className="hidden lg:block absolute top-[28px] left-[60px] w-[calc(100%-60px)] h-px bg-white/10"></div>}
                
                <div className="w-14 h-14 rounded-full border border-white/10 bg-zinc-900/50 flex items-center justify-center mb-8 group-hover:bg-white group-hover:border-transparent transition-all duration-500 relative z-10">
                  <step.icon className="w-6 h-6 text-slate-400 group-hover:text-black transition-colors duration-500" />
                </div>
                <h3 className="text-xl font-medium mb-4 text-white">{step.title}</h3>
                <p className="text-sm font-light text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hero 2 CTA */}
      <section className="py-32 px-6 overflow-hidden relative border-t border-white/5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full -z-10 pointer-events-none opacity-40">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-white/5 blur-[100px] rounded-full mix-blend-screen"></div>
        </div>
        <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-medium mb-8 tracking-tighter text-white">Performans, Güvenilirlik <br />ve Saf Güç.</h2>
            <p className="text-slate-400 font-light text-lg mb-12">Artık sınırlara takılmayın. Modern mimarinin tüm nimetlerinden faydalanın.</p>
            <Link to="/builder" className="inline-flex px-8 py-4 bg-white text-black rounded-full text-sm font-medium transition-all hover:scale-[1.02] hover:bg-slate-200">
               Hemen Toplamaya Başla
            </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 bg-[#000000]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
              <CpuChipIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium tracking-wide text-white">PC TEKLİF</span>
          </div>
          <p className="text-slate-500 text-sm font-light">© 2026 PC Teklif Yöneticisi. Güç ve Minimalizm Bir Arada.</p>
          <div className="flex gap-8 text-slate-500 text-sm font-light">
            <a href="#" className="hover:text-white transition-colors">Destek Merkezi</a>
            <a href="#" className="hover:text-white transition-colors">Gizlilik & Şartlar</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
