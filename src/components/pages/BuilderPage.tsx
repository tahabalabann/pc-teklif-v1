import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ShoppingBagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CpuChipIcon
} from "@heroicons/react/24/outline";
import { useBuilderStore, BUILDER_STEPS } from "../../store/useBuilderStore";
import { productsApi, quotesApi } from "../../utils/api";
import type { CatalogProduct } from "../../utils/api";
import { formatCurrency } from "../../utils/money";
import { Button } from "../ui/Button";
import { toast } from "react-hot-toast";
import { useAppStore } from "../../store/useAppStore";
import { useNavigate } from "react-router-dom";

export const BuilderPage = () => {
  const { 
    currentStep, 
    selections, 
    totalPriceTRY, 
    nextStep, 
    prevStep, 
    setStep,
    selectProduct, 
    removeProduct,
    isStepComplete
  } = useBuilderStore();

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const currentCategory = BUILDER_STEPS[currentStep];

  useEffect(() => {
    void loadProducts();
  }, [currentCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const allProducts = await productsApi.listPublic();
      // Filter products by current category
      const filtered = allProducts.filter(p => p.category === currentCategory);
      setProducts(filtered);
    } catch (error) {
      toast.error("Ürünler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const session = useAppStore((state) => state.session);
  const navigate = useNavigate();

  const handleFinish = async () => {
    if (!session) {
      toast.error("Teklif talebi oluşturmak için üye girişi yapmanız gerekmektedir.");
      navigate("/register");
      return;
    }

    const selectionsData: Record<string, string> = {};
    Object.entries(selections).forEach(([category, product]) => {
      if (product) selectionsData[category] = product.id;
    });

    if (Object.keys(selectionsData).length === 0) {
      toast.error("Lütfen en az bir parça seçin.");
      return;
    }

    try {
      setLoading(true);
      await quotesApi.createFromBuilder(selectionsData);
      toast.success("Teklif talebiniz başarıyla iletildi! Yönlendiriliyorsunuz...");
      setTimeout(() => navigate("/customer"), 2000);
    } catch (error) {
      toast.error("Teklif oluşturulurken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header & Steps Area */}
        <div className="mb-12">
          <h1 className="text-3xl font-black mb-8 tracking-tight">
            Sistem <span className="text-amber-500">Sihirbazı</span>
          </h1>
          
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {BUILDER_STEPS.map((step, index) => {
              const isCurrent = index === currentStep;
              const isDone = isStepComplete(index);
              
              return (
                <div 
                  key={step} 
                  className={`flex flex-col items-center min-w-[100px] cursor-pointer group`}
                  onClick={() => setStep(index)}
                >
                  <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300
                    ${isCurrent ? 'bg-amber-500 shadow-lg shadow-amber-500/20 scale-110' : 
                      isDone ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-white/5 border border-white/10'}
                  `}>
                    {isDone ? (
                      <CheckCircleIcon className={`w-6 h-6 ${isCurrent ? 'text-black' : 'text-emerald-500'}`} />
                    ) : (
                      <span className={`text-sm font-bold ${isCurrent ? 'text-black' : 'text-slate-500'}`}>{index + 1}</span>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${isCurrent ? 'text-amber-500' : 'text-slate-500'}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Selection Area */}
          <div className="lg:col-span-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CpuChipIcon className="w-5 h-5 text-amber-500" />
                {currentCategory} Seçimi
              </h2>
              <span className="text-sm text-slate-500">{products.length} Seçenek Mevcut</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div 
                    key="loading" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="col-span-full py-20 text-center text-slate-500"
                  >
                    Ürünler hazırlanıyor...
                  </motion.div>
                ) : products.length === 0 ? (
                  <motion.div 
                    key="empty" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl"
                  >
                    <ExclamationTriangleIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">Bu kategoride henüz ürün bulunmuyor.</p>
                  </motion.div>
                ) : (
                  products.map((product) => {
                    const isSelected = selections[currentCategory]?.id === product.id;
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`
                          relative p-5 rounded-3xl border-2 transition-all cursor-pointer group
                          ${isSelected ? 'bg-amber-500/10 border-amber-500' : 'bg-white/5 border-white/5 hover:border-white/10'}
                        `}
                        onClick={() => selectProduct(currentCategory, product)}
                      >
                        <div className="aspect-square bg-black/40 rounded-2xl mb-4 overflow-hidden border border-white/5">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-700">Görsel Yok</div>
                          )}
                        </div>
                        <h3 className="font-bold mb-1 line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">{product.description}</p>
                        
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-lg font-black">{formatCurrency(product.salePrice)}</span>
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center transition-all
                            ${isSelected ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/50 group-hover:bg-amber-500/20 group-hover:text-amber-500'}
                          `}>
                            {isSelected ? <CheckCircleIcon className="w-6 h-6" /> : <ChevronRightIcon className="w-4 h-4" />}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
            
            {/* Bottom Nav Bar */}
            <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-8">
              <Button 
                variant="secondary" 
                onClick={prevStep} 
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeftIcon className="w-5 h-5" />
                Geri Dön
              </Button>
              <Button 
                variant="primary" 
                onClick={nextStep} 
                disabled={currentStep === BUILDER_STEPS.length - 1 || !selections[currentCategory]}
                className="bg-amber-500 text-black hover:bg-amber-400 border-none flex items-center gap-2"
              >
                Sonraki Adım
                <ChevronRightIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <ShoppingBagIcon className="w-5 h-5 text-amber-500" />
                Sistem Özeti
              </h3>

              <div className="space-y-4 mb-8">
                {BUILDER_STEPS.map((step) => (
                  <div key={step} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <span>{step}</span>
                      {selections[step] && (
                        <button 
                          onClick={() => removeProduct(step)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Kaldır
                        </button>
                      )}
                    </div>
                    {selections[step] ? (
                      <div className="text-sm font-medium border-l-2 border-amber-500 pl-3 py-1 bg-white/5 rounded-r-lg">
                        {selections[step]?.name}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600 border-l-2 border-white/5 pl-3 py-1">
                        Henüz seçilmedi
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Toplam Tahmini Tutar</span>
                  <span className="text-2xl font-black text-amber-500">{formatCurrency(totalPriceTRY)}</span>
                </div>
                
                <Button 
                  fullWidth 
                  size="xl" 
                  onClick={handleFinish}
                  disabled={!Object.values(selections).some(s => s !== null)}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-black border-none font-black shadow-lg shadow-amber-500/10"
                >
                  Teklif Al
                </Button>
                <p className="text-[10px] text-center text-slate-500">
                  Seçtiğiniz sistem yapılandırması üzerinden uzmanlarımızın size özel fiyat çalışması yapması için talebi iletebilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
