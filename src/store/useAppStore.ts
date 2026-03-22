import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppUser, Quote } from "../types/quote";

interface AppState {
  session: { token: string; user: AppUser } | null;
  theme: "light" | "dark";
  route: string;
  isMobileMenuOpen: boolean;
  setSession: (session: { token: string; user: AppUser } | null) => void;
  setTheme: (theme: "light" | "dark") => void;
  setRoute: (route: string) => void;
  setMobileMenuOpen: (isOpen: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      theme: "light",
      route: "quotes",
      isMobileMenuOpen: false,
      setSession: (session) => set({ session }),
      setTheme: (theme) => set({ theme }),
      setRoute: (route) => set({ route, isMobileMenuOpen: false }),
      setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen }),
      logout: () => set({ session: null, route: "quotes" }),
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
