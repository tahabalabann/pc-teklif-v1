import type { Quote } from "../../types/quote";
import { Card } from "../ui/Card";

interface SellerInfoCardProps {
  quote: Quote;
}

export function SellerInfoCard({ quote }: SellerInfoCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-ink-900 via-ink-800 to-red-700 px-5 py-5 text-white">
        <div className="flex items-center gap-4">
          {quote.companyLogo ? (
            <img
              src={quote.companyLogo}
              alt={quote.companyName}
              className="h-16 w-16 rounded-2xl bg-white object-cover p-2"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold">
              {quote.companyName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-100">Firma Bilgisi</p>
            <h2 className="mt-1 text-xl font-semibold">{quote.companyName || "Firma Ad\u0131"}</h2>
          </div>
        </div>
      </div>
      <div className="space-y-4 px-5 py-5">
        <div>
          <p className="text-sm font-semibold text-ink-900">{"Sat\u0131c\u0131 \u0130leti\u015fimi"}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-600">{quote.sellerInfo || "-"}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900">Garanti / Test Notu</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-600">{quote.warrantyInfo || "-"}</p>
        </div>
      </div>
    </Card>
  );
}
