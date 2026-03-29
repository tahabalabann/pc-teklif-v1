import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "react-hot-toast";
import type { AppUser, Quote } from "../types/quote";

interface AppState {
  session: { token: string; user: AppUser } | null;
  theme: "light" | "dark";
  route: string;
  isMobileMenuOpen: boolean;
  rates: { TRY: number; USD: number; EUR: number; GBP: number } | null;
  setSession: (session: { token: string; user: AppUser } | null) => void;
  setTheme: (theme: "light" | "dark") => void;
  setRoute: (route: string) => void;
  setMobileMenuOpen: (isOpen: boolean) => void;
  setRates: (rates: { TRY: number; USD: number; EUR: number; GBP: number } | null) => void;
  fetchRates: () => Promise<void>;
  logout: () => void;
  initRealtime: () => (() => void) | undefined;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      theme: "light",
      route: "quotes",
      isMobileMenuOpen: false,
      rates: null,
      setSession: (session) => set({ session }),
      setTheme: (theme) => set({ theme }),
      setRoute: (route) => set({ route, isMobileMenuOpen: false }),
      setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
      setRates: (rates) => set({ rates }),
      fetchRates: async () => {
        try {
          const { ratesApi } = await import("../utils/api");
          const rates = await ratesApi.getRates();
          set({ rates });
        } catch (error) {
          console.error("Rates fetch error", error);
        }
      },
      logout: () => set({ session: null, route: "quotes" }),
      initRealtime: () => {
        // Import sessionStorageApi to use the same token key as the rest of the app
        const token = window.localStorage.getItem("pc-teklif:sessionToken");
        if (!token) return undefined;

        const eventSource = new EventSource(`/api/notifications/stream?token=${token}`);
        
        eventSource.onmessage = (event) => {
          try {
            const { type, data } = JSON.parse(event.data);
            
            if (type === "deposit_request_approved") {
              const currentSession = useAppStore.getState().session;
              if (currentSession && data.userId === currentSession.user.id) {
                toast.success(`Bakiyeniz güncellendi: ${data.amount} ₺`);
                set({ session: { ...currentSession, user: { ...currentSession.user, balance: data.amount } } });
              }
            }

            if (type === "quote_status_updated") {
               toast(`Teklif durumu güncellendi: ${data.status}`, { icon: "🔔" });
            }
          } catch (e) {
            console.error("Realtime parse error", e);
          }
        };

        eventSource.onerror = () => {
          // Silently handle SSE connection errors (e.g. when auth token is invalid/expired)
          eventSource.close();
        };

        return () => eventSource.close();
      }
    }),
    {
      name: "pc-teklif-app-storage",
      partialize: (state) => ({ theme: state.theme }), // Only persist theme to localStorage automatically
    }
  )
);

interface QuoteState {
  activeQuote: Quote | null;
  savedQuotes: Quote[];
  setActiveQuote: (quote: Quote | null) => void;
  setSavedQuotes: (quotes: Quote[]) => void;
  addOrUpdateSavedQuote: (quote: Quote) => void;
  removeSavedQuote: (id: string) => void;
}

export const useQuoteStore = create<QuoteState>((set) => ({
  activeQuote: null,
  savedQuotes: [],
  setActiveQuote: (quote) => set({ activeQuote: quote }),
  setSavedQuotes: (quotes) => set({ savedQuotes: quotes }),
  addOrUpdateSavedQuote: (quote) => set((state) => {
    const exists = state.savedQuotes.find(q => q.id === quote.id);
    if (exists) {
      return { savedQuotes: state.savedQuotes.map(q => q.id === quote.id ? quote : q) };
    }
    return { savedQuotes: [quote, ...state.savedQuotes] };
  }),
  removeSavedQuote: (id) => set((state) => ({
    savedQuotes: state.savedQuotes.filter(q => q.id !== id)
  }))
}));
