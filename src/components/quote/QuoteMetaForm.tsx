import { useState, type ChangeEvent, type ReactNode } from "react";
import type { Quote, QuoteStatus } from "../../types/quote";
import { uploadApi } from "../../utils/api";
import { toast } from "react-hot-toast";
import { Card } from "../ui/Card";

const statuses: QuoteStatus[] = [
  "Yeni Teklif",
  "Onay Bekliyor",
  "Onaylandı",
  "Reddedildi",
  "Ödeme Alındı",
  "Hazırlanıyor",
  "Kargolandı",
  "Teslim Edildi",
  "Tamamlandı",
  "İptal",
];

interface QuoteMetaFormProps {
  quote: Quote;
  onChange: (field: keyof Quote, value: string) => void;
}

export function QuoteMetaForm({ quote, onChange }: QuoteMetaFormProps) {
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleInput =
    (field: keyof Quote) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(field, event.target.value);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5MB'dan küçük olmalıdır.");
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const url = await uploadApi.uploadImage(base64, file.name);
          onChange("quoteImage", url);
          toast.success("Teklif görseli yüklendi.");
        } catch (error) {
          toast.error("Teklif görseli yüklenemedi.");
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Dosya okunamadı.");
      setUploadingImage(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Teklif Bilgileri</h2>
          <p className="mt-1 text-sm text-ink-600">Müşteri ve firma bilgilerini düzenleyin.</p>
        </div>
        <div className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          Teklif No: {quote.quoteNo}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Müşteri Adı">
          <input className="field" value={quote.customerName} onChange={handleInput("customerName")} />
        </Field>
        <Field label="Tarih">
          <input className="field" type="date" value={quote.date} onChange={handleInput("date")} />
        </Field>
        <Field label="Teklif No">
          <input className="field" value={quote.quoteNo} onChange={handleInput("quoteNo")} />
        </Field>
        <Field label="Durum">
          <select className="field" value={quote.status} onChange={handleInput("status")}>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Firma Adı">
          <input className="field" value={quote.companyName} onChange={handleInput("companyName")} />
        </Field>
        <Field label="Logo URL">
          <input className="field" value={quote.companyLogo} onChange={handleInput("companyLogo")} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Field label="Satıcı İletişim Bilgisi">
          <textarea
            className="field min-h-28 resize-y"
            value={quote.sellerInfo}
            onChange={handleInput("sellerInfo")}
          />
        </Field>
        <Field label="Garanti / Test Durumu">
          <textarea
            className="field min-h-28 resize-y"
            value={quote.warrantyInfo}
            onChange={handleInput("warrantyInfo")}
          />
        </Field>
        <Field label="Notlar">
          <textarea className="field min-h-28 resize-y" value={quote.notes} onChange={handleInput("notes")} />
        </Field>
      </div>

      <div className="mt-4 border-t border-ink-100 pt-4">
        <label className="block max-w-lg">
          <span className="mb-2 block text-sm font-medium text-ink-900">Teklif / Kasa Görseli (Opsiyonel)</span>
          <p className="text-sm text-ink-500 mb-3">
            Toplu sistem satışları veya tek resimli gösterimler için kullanılır. Eklenirse PDF çıktısında gösterilir.
          </p>
          <div className="flex items-center gap-4">
            {quote.quoteImage && (
              <img src={quote.quoteImage} alt="Teklif Görseli" className="h-20 w-20 object-cover rounded-xl shadow-sm border border-ink-200 bg-white" />
            )}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                disabled={uploadingImage}
                className="block w-full text-sm text-ink-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
              />
              {uploadingImage && <p className="text-xs text-brand-600 mt-1">Görsel yükleniyor...</p>}
            </div>
            {quote.quoteImage && (
              <button type="button" onClick={() => onChange("quoteImage", "")} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-red-100 bg-white shadow-sm">
                Kaldır
              </button>
            )}
          </div>
        </label>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-600">{label}</span>
      {children}
    </label>
  );
}
