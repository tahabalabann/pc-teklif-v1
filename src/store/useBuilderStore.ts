import { create } from "zustand";
import type { CatalogProduct } from "../utils/api";

export const BUILDER_STEPS = [
  "Kasa",
  "Anakart",
  "İşlemci",
  "Bellek",
  "Ekran Kartı",
  "Depolama",
  "Güç Kaynağı",
  "İşlemci Soğutucu"
];

interface BuilderState {
  currentStep: number;
  selections: Record<string, CatalogProduct | null>;
  totalPriceUSD: number;
  totalPriceTRY: number;
  
  // Actions
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  selectProduct: (category: string, product: CatalogProduct) => void;
  removeProduct: (category: string) => void;
  resetBuilder: () => void;
  
  // Helpers
  calculateTotals: () => void;
  isStepComplete: (stepIndex: number) => boolean;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  currentStep: 0,
  selections: BUILDER_STEPS.reduce((acc, step) => ({ ...acc, [step]: null }), {}),
  totalPriceUSD: 0,
  totalPriceTRY: 0,

  nextStep: () => {
    const { currentStep } = get();
    if (currentStep < BUILDER_STEPS.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  setStep: (step) => set({ currentStep: step }),

  selectProduct: (category, product) => {
    set((state) => ({
      selections: { ...state.selections, [category]: product }
    }));
    get().calculateTotals();
  },

  removeProduct: (category) => {
    set((state) => ({
      selections: { ...state.selections, [category]: null }
    }));
    get().calculateTotals();
  },

  resetBuilder: () => set({
    currentStep: 0,
    selections: BUILDER_STEPS.reduce((acc, step) => ({ ...acc, [step]: null }), {}),
    totalPriceUSD: 0,
    totalPriceTRY: 0
  }),

  isStepComplete: (stepIndex) => {
    const { selections } = get();
    const category = BUILDER_STEPS[stepIndex];
    return !!selections[category];
  },

  calculateTotals: () => {
    const { selections } = get();
    let totalTRY = 0;

    Object.values(selections).forEach((product) => {
      if (product) {
        totalTRY += product.salePrice || 0;
      }
    });

    set({ totalPriceTRY: totalTRY });
  }
}));
