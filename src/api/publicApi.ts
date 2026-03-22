import type { Quote } from "../types/quote";

export const publicApi = {
  getQuote: async (id: string): Promise<Quote> => {
    const res = await fetch(`/api/public/quotes/${id}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Teklif yüklenemedi veya süresi doldu.");
    }
    const data = await res.json();
    return data.quote as Quote;
  },

  updateStatus: async (id: string, status: "Onaylandı" | "Reddedildi", customerNote: string = ""): Promise<Quote> => {
    const res = await fetch(`/api/public/quotes/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, customerNote }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Durum güncellenemedi.");
    }
    const data = await res.json();
    return data.quote as Quote;
  },
};
