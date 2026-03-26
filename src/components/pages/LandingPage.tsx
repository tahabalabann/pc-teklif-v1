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
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-purple-500/30">
      {/* Navigation Overlay */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-slate-950/50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <CpuChipIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              PC TEKLİF
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#systems" className="hover:text-white transition-colors">Hazır Sistemler</a>
            <a href="#builder" className="hover:text-white transition-colors">Sistem Topla</a>
            <a href="#process" className="hover:text-white transition-colors">Nasıl Çalışır?</a>
          </div>

          <Link 
            to="/quotes" 
            className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-semibold"
          >
            Yönetim Paneli
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-600/20 blur-[100px] rounded-full"></div>
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-widest uppercase">
              Geleceğin Teknolojisi Bugün Burada
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[1.1] tracking-tighter">
              Sınırlarını <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">
                Sen Belirle.
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl mb-12 font-medium">
              Hayalindeki PC sistemini dakikalar içinde tasarla, uzman ekibimizden 
              sana özel teklif al ve performansın zirvesine çık.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10">
                <span className="relative z-10 flex items-center gap-2">
                  Kendi Sistemini Topla
                  <ChevronRightIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-blue-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
              
              <a href="#systems" className="px-8 py-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 font-bold transition-all">
                Hazır Sistemleri İncele
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Systems */}
      <section id="systems" className="py-24 px-6 bg-slate-950/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl font-bold mb-4 tracking-tight">Efsanevi Yapılandırmalar</h2>
              <p className="text-slate-400">Senin için önceden optimize edilmiş, performansa hazır canavarlar.</p>
            </div>
            <button className="text-purple-400 font-bold flex items-center gap-2 hover:text-purple-300 transition-colors uppercase text-sm tracking-wider">
              Tümünü Gör
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              { 
                name: "Apex Vanguard", 
                tag: "Giriş Seviyesi", 
                price: "24.900 TL", 
                specs: ["RTX 4060", "Ryzen 5 7500F", "16GB RAM"],
                color: "from-blue-500/20"
              },
              { 
                name: "Nova Prime", 
                tag: "Orta Segment", 
                price: "42.500 TL", 
                specs: ["RTX 4070 Super", "i7-14700K", "32GB RAM"],
                color: "from-purple-500/20"
              },
              { 
                name: "Titan Eternal", 
                tag: "Extreme Performance", 
                price: "115.000 TL", 
                specs: ["RTX 4090", "Ryzen 9 7950X3D", "64GB RAM"],
                color: "from-red-500/20"
              }
            ].map((system, i) => (
              <motion.div 
                key={i} 
                variants={itemVariants}
                className={`group relative p-8 rounded-3xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition-all hover:-translate-y-2 overflow-hidden`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${system.color} blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                
                <span className="block mb-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{system.tag}</span>
                <h3 className="text-2xl font-bold mb-6">{system.name}</h3>
                
                <div className="space-y-3 mb-8">
                  {system.specs.map((spec, j) => (
                    <div key={j} className="flex items-center gap-3 text-sm text-slate-400 bg-white/5 px-3 py-2 rounded-lg">
                      <CpuChipIcon className="w-4 h-4 text-blue-400" />
                      {spec}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <span className="text-xl font-black">{system.price}</span>
                  <button className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform">
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Process Section */}
      <section id="process" className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Hayalinden Teslimata</h2>
            <p className="text-slate-400">4 Kolay Adımda Yeni Canavarına Kavuş</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: RocketLaunchIcon, title: "Talebi Oluştur", desc: "Sihirbazla sistemini topla veya hazır kasa seç." },
              { icon: CpuChipIcon, title: "Özel Teklif Al", desc: "Sana özel fiyatlandırma ve stok onayı gelsin." },
              { icon: ShieldCheckIcon, title: "Online Onayla", desc: "Teklifini tek tıkla doğrula ve süreci başlat." },
              { icon: TruckIcon, title: "Hızlı Teslimat", desc: "Montaj ve test sonrası kapında olsun." }
            ].map((step, i) => (
              <div key={i} className="relative group p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors text-center">
                <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <step.icon className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <CpuChipIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">PC TEKLİF</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 PC Teklif Sistemi. Tüm Hakları Saklıdır.</p>
          <div className="flex gap-6 text-slate-400 text-sm">
            <a href="#" className="hover:text-white">Destek</a>
            <a href="#" className="hover:text-white">Şartlar</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
