export interface CatalogPartItem {
  id: string;
  category: string;
  product: string;
  description: string;
  purchasePrice: number;
  salePrice: number;
  lastPurchaseNote?: string;
  lastSaleNote?: string;
}

export const partsCatalog: CatalogPartItem[] = [
  {
    id: "cpu-r5-5600",
    category: "İşlemci",
    product: "AMD Ryzen 5 5600",
    description: "6C/12T, testli ikinci el",
    purchasePrice: 2400,
    salePrice: 2950,
    lastPurchaseNote: "Son alış: 2.400 TL",
    lastSaleNote: "Son satış: 2.950 TL",
  },
  {
    id: "cpu-i5-12400f",
    category: "İşlemci",
    product: "Intel Core i5-12400F",
    description: "6C/12T, kutusuz OEM",
    purchasePrice: 3400,
    salePrice: 3990,
    lastPurchaseNote: "Son alış: 3.400 TL",
    lastSaleNote: "Son satış: 3.990 TL",
  },
  {
    id: "gpu-rtx3060ti",
    category: "Ekran Kartı",
    product: "RTX 3060 Ti 8GB",
    description: "Mining görmemiş, fan bakımlı",
    purchasePrice: 7600,
    salePrice: 8890,
  },
  {
    id: "gpu-rx6600",
    category: "Ekran Kartı",
    product: "RX 6600 8GB",
    description: "1080p oyuncu sistemi için ideal",
    purchasePrice: 5200,
    salePrice: 6190,
  },
  {
    id: "mb-b550m",
    category: "Anakart",
    product: "B550M Anakart",
    description: "M.2 destekli, BIOS güncel",
    purchasePrice: 2400,
    salePrice: 2990,
  },
  {
    id: "ram-16-ddr4",
    category: "RAM",
    product: "16GB DDR4 3200MHz",
    description: "2x8 kit, testli",
    purchasePrice: 1100,
    salePrice: 1490,
  },
  {
    id: "ssd-500",
    category: "SSD",
    product: "500GB NVMe SSD",
    description: "Sağlık oranı yüksek",
    purchasePrice: 700,
    salePrice: 990,
  },
  {
    id: "psu-650",
    category: "Güç Kaynağı",
    product: "650W 80+ Bronze",
    description: "Temiz, sessiz çalışma",
    purchasePrice: 950,
    salePrice: 1390,
  },
];
