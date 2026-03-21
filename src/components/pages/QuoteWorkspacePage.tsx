import { useState } from "react";
import type { PrintTemplateMode, Quote, QuoteTemplate } from "../../types/quote";
import { PricingSummary } from "../pricing/PricingSummary";
import { CustomerPreview } from "../quote/CustomerPreview";
import { PartsEditorTable } from "../quote/PartsEditorTable";
import { QuoteMetaForm } from "../quote/QuoteMetaForm";
import { SellerInfoCard } from "../quote/SellerInfoCard";
import { TemplateSelector } from "../quote/TemplateSelector";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ratesApi } from "../../utils/api";
import { toast } from "react-hot-toast";

interface QuoteWorkspacePageProps {
  activeQuote: Quote;
  templates: QuoteTemplate[];
  showItemPricesInPrint: boolean;
  printTemplate: PrintTemplateMode;
  onShowItemPricesChange: (checked: boolean) => void;
  onPrintTemplateChange: (template: PrintTemplateMode) => void;
  onPatchQuote: (patch: Partial<Quote>) => void;
  onSaveQuote: () => void | Promise<void>;
  onDuplicateActive: () => void;
  onNewQuote: () => void;
  onResetQuote: () => void;
  onApplyTemplate: (templateId: string) => void;
  onBackToList: () => void;
  saveStatusText: string;
  saveStatusTone: "normal" | "error";
}

export function QuoteWorkspacePage({
  activeQuote,
  templates,
  showItemPricesInPrint,
  printTemplate,
  onShowItemPricesChange,
  onPrintTemplateChange,
  onPatchQuote,
  onSaveQuote,
  onDuplicateActive,
  onNewQuote,
  onResetQuote,
  onApplyTemplate,
  onBackToList,
  saveStatusText,
  saveStatusTone,
}: QuoteWorkspacePageProps) {
  const [mode, setMode] = useState<"admin" | "customer">("admin");

  return (
    <div className="space-y-6">
      <Card className="sticky top-[80px] z-10 p-5 ring-1 ring-white/20 print:hidden shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <p className="panel-label">Teklifler / Detay</p>
            <p className="mt-1 text-sm text-ink-600">
              {activeQuote.quoteNo} • {activeQuote.customerName || "Adsiz musteri"}
            </p>
          </div>

          <Button onClick={onBackToList} type="button" variant="ghost">
            Teklif Listesine Don
          </Button>

          <div className="inline-flex rounded-xl bg-ink-100/50 p-1 ring-1 ring-inset ring-ink-200/50 backdrop-blur-sm">
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                mode === "admin"
                  ? "bg-white text-brand-600 shadow-sm ring-1 ring-ink-200"
                  : "text-ink-600 hover:text-ink-900 hover:bg-white/50"
              }`}
              onClick={() => setMode("admin")}
              type="button"
            >
              Yonetim
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                mode === "customer"
                  ? "bg-white text-brand-600 shadow-sm ring-1 ring-ink-200"
                  : "text-ink-600 hover:text-ink-900 hover:bg-white/50"
              }`}
              onClick={() => setMode("customer")}
              type="button"
            >
              Musteri
            </button>
          </div>

          <label className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-ink-700 ring-1 ring-inset ring-ink-200 dark-chip">
            <input
              checked={showItemPricesInPrint}
              className="h-4 w-4 rounded border-ink-300 text-red-600 focus:ring-red-300"
              onChange={(event) => onShowItemPricesChange(event.target.checked)}
              type="checkbox"
            />
            <span>PDF'de parca fiyatlarini tek tek goster</span>
          </label>

          <div className="flex gap-2 items-center">
            <select
              className="field min-w-[100px]"
              value={activeQuote.currency || "TRY"}
              onChange={async (event) => {
                const currency = event.target.value as "TRY" | "USD" | "EUR" | "GBP";
                if (currency === "TRY") {
                  onPatchQuote({ currency, exchangeRate: 1 });
                  return;
                }
                const toastId = toast.loading("Güncel kur çekiliyor...");
                try {
                  const rates = await ratesApi.getRates();
                  onPatchQuote({ currency, exchangeRate: rates[currency] || 1 });
                  toast.success("Kur güncellendi", { id: toastId });
                } catch (error) {
                  toast.error("Kur alınamadı", { id: toastId });
                  onPatchQuote({ currency, exchangeRate: 1 });
                }
              }}
            >
              <option value="TRY">TL (₺)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
            {activeQuote.currency !== "TRY" && (
              <span className="text-xs text-ink-500 font-medium">Kur: {activeQuote.exchangeRate}</span>
            )}
          </div>

          <select
            className="field min-w-[220px]"
            value={printTemplate}
            onChange={(event) => onPrintTemplateChange(event.target.value as PrintTemplateMode)}
          >
            <option value="standard">Standart Teklif</option>
            <option value="proforma">Resmi Proforma</option>
            <option value="products">Sadece Urun Listesi</option>
            <option value="shipping">Kargo Dahil Teklif</option>
          </select>

          <Button onClick={() => void onSaveQuote()} type="button" variant="primary">
            Teklifi Kaydet
          </Button>
          <Button onClick={onDuplicateActive} type="button" variant="secondary">
            Bu Teklifi Kopyala
          </Button>
          <Button onClick={onNewQuote} type="button">
            Yeni Teklif
          </Button>
          <Button onClick={onResetQuote} type="button">
            Teklifi Sifirla
          </Button>

          {saveStatusText && (
            <span className={`text-sm ${saveStatusTone === "error" ? "text-red-600" : "text-ink-500"}`}>
              {saveStatusText}
            </span>
          )}
        </div>
      </Card>

      {mode === "admin" ? (
        <>
          <TemplateSelector templates={templates} onApply={onApplyTemplate} />
          <QuoteMetaForm
            quote={activeQuote}
            onChange={(field, value) => onPatchQuote({ [field]: value } as Partial<Quote>)}
          />
          <PartsEditorTable rows={activeQuote.rows} onChange={(rows) => onPatchQuote({ rows })} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <PricingSummary
              quote={activeQuote}
              onNumberChange={(field, value) => onPatchQuote({ [field]: value } as Partial<Quote>)}
            />
            <SellerInfoCard quote={activeQuote} />
          </div>
        </>
      ) : (
        <>
          <CustomerPreview quote={activeQuote} />
          <div className="grid gap-6 md:grid-cols-2 print:hidden">
            <PricingSummary
              quote={activeQuote}
              compact
              onNumberChange={(field, value) => onPatchQuote({ [field]: value } as Partial<Quote>)}
            />
            <SellerInfoCard quote={activeQuote} />
          </div>
        </>
      )}
    </div>
  );
}
