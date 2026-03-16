import type { ChangeEvent, ReactNode } from "react";
import type { Quote, QuoteStatus } from "../../types/quote";
import { Card } from "../ui/Card";

const statuses: QuoteStatus[] = [
  "Yeni Teklif",
  "Onay Bekliyor",
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
  const handleInput =
    (field: keyof Quote) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange(field, event.target.value);

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
