import type { QuoteTemplate } from "../types/quote";
import { createEmptyQuote, generateId } from "../utils/quote";

const buildTemplate = (
  id: string,
  name: string,
  description: string,
  rows: Array<{ category: string; product: string; description: string; purchasePrice: number; salePrice: number }>,
  extra?: Partial<QuoteTemplate["quote"]>,
): QuoteTemplate => {
  const base = createEmptyQuote();

  return {
    id,
    name,
    description,
    quote: {
      ...base,
      ...extra,
      id: generateId(),
      rows: rows.map((row) => ({ id: generateId(), ...row })),
    },
  };
};

export const defaultTemplates: QuoteTemplate[] = [
  buildTemplate(
    "gaming",
    "Oyuncu Sistemi",
    "Y\u00fcksek ekran kart\u0131 odakl\u0131, vitrinlik oyuncu sistemi.",
    [
      { category: "\u0130\u015flemci", product: "AMD Ryzen 5 5600", description: "6 \u00e7ekirdek, kutulu", purchasePrice: 2900, salePrice: 3400 },
      { category: "Anakart", product: "B550M DDR4", description: "M.2 destekli", purchasePrice: 2150, salePrice: 2500 },
      { category: "Ekran Kart\u0131", product: "RTX 3070 8 GB", description: "Test edildi, temiz", purchasePrice: 10300, salePrice: 11500 },
      { category: "RAM", product: "16 GB DDR4", description: "2x8 3200 MHz", purchasePrice: 1280, salePrice: 1550 },
      { category: "SSD", product: "500 GB NVMe", description: "Sa\u011fl\u0131k %100", purchasePrice: 850, salePrice: 1100 },
      { category: "G\u00fc\u00e7 Kayna\u011f\u0131", product: "650W 80+ Bronze", description: "Sessiz fan", purchasePrice: 1450, salePrice: 1800 },
      { category: "Kasa", product: "Tempered Glass Mid Tower", description: "4 fanl\u0131", purchasePrice: 1450, salePrice: 1750 }
    ],
    {
      labor: 500,
      salesPrice: 24500,
      cashPrice: 23900,
      tradePrice: 25500,
      costPrice: 1070,
      notes: "Oyun ve performans odakl\u0131. T\u00fcm stres testleri yap\u0131ld\u0131.",
    },
  ),
  buildTemplate(
    "office",
    "Ofis Sistemi",
    "H\u0131zl\u0131 teslim, sessiz ve stabil g\u00fcnl\u00fck kullan\u0131m paketi.",
    [
      { category: "\u0130\u015flemci", product: "Intel i5 10400", description: "Dahili grafik", purchasePrice: 2350, salePrice: 2800 },
      { category: "Anakart", product: "H510M", description: "USB 3.0 destekli", purchasePrice: 1500, salePrice: 1800 },
      { category: "RAM", product: "16 GB DDR4", description: "2x8 2666 MHz", purchasePrice: 1190, salePrice: 1450 },
      { category: "SSD", product: "480 GB SATA SSD", description: "Yeni", purchasePrice: 720, salePrice: 950 },
      { category: "Kasa", product: "Micro ATX Kasa", description: "Ofis tipi", purchasePrice: 1050, salePrice: 1350 },
      { category: "Monit\u00f6r", product: "22 in IPS Monitor", description: "Full HD", purchasePrice: 2050, salePrice: 2400 },
      { category: "Klavye / Mouse", product: "USB Set", description: "Kablosuz", purchasePrice: 450, salePrice: 650 }
    ],
    {
      labor: 350,
      salesPrice: 12800,
      cashPrice: 12450,
      costPrice: 590,
      notes: "Ofis, muhasebe ve ev kullan\u0131m\u0131 i\u00e7in uygundur.",
    },
  ),
  buildTemplate(
    "balanced",
    "Fiyat / Performans",
    "B\u00fct\u00e7eyi zorlamadan dengeli performans sunan sistem.",
    [
      { category: "\u0130\u015flemci", product: "Ryzen 5 3600", description: "6C/12T", purchasePrice: 2350, salePrice: 2700 },
      { category: "Anakart", product: "A520M", description: "Temiz, g\u00fcncel BIOS", purchasePrice: 1400, salePrice: 1700 },
      { category: "Ekran Kart\u0131", product: "RX 6600 8 GB", description: "Full HD i\u00e7in ideal", purchasePrice: 6900, salePrice: 7600 },
      { category: "RAM", product: "16 GB DDR4", description: "3200 MHz", purchasePrice: 1190, salePrice: 1450 },
      { category: "SSD", product: "512 GB NVMe", description: "H\u0131zl\u0131 a\u00e7\u0131l\u0131\u015f", purchasePrice: 920, salePrice: 1200 },
      { category: "G\u00fc\u00e7 Kayna\u011f\u0131", product: "600W 80+", description: "G\u00fcvenilir seri", purchasePrice: 1200, salePrice: 1500 },
      { category: "Kasa", product: "Mesh \u00d6n Panel", description: "Hava ak\u0131\u015fl\u0131", purchasePrice: 1280, salePrice: 1550 }
    ],
    {
      labor: 400,
      shipping: 250,
      salesPrice: 17600,
      cashPrice: 17150,
      tradePrice: 18250,
      costPrice: 300,
      notes: "Y\u00fcksek fiyat/performans odakl\u0131 stok sistemi.",
    },
  ),
];
