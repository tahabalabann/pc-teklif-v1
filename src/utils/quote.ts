import type {
  GeliverParcel,
  GeliverRecipientAddress,
  Quote,
  QuoteRow,
  QuoteStatus,
} from "../types/quote";

export const DEFAULT_ROW_CATEGORIES = [
  "İşlemci",
  "Anakart",
  "Ekran Kartı",
  "RAM",
  "SSD",
  "HDD",
  "Güç Kaynağı",
  "Kasa",
  "Monitör",
  "Klavye / Mouse",
  "Soğutucu",
  "Diğer",
] as const;

const DEFAULT_STATUS: QuoteStatus = "Yeni Teklif";
const DEFAULT_COMPANY_NAME = "Balaban Bilgisayar";
const LEGACY_COMPANY_NAMES = ["Nova Bilgisayar"];
const DEFAULT_SELLER_INFO = "Telefon: 0543 907 05 10\nInstagram: @tahabruh\nAdres: İstanbul/Çekmeköy";
const LEGACY_SELLER_INFOS = [
  "Telefon: 05xx xxx xx xx\nInstagram: @magazaadi\nAdres: Istanbul",
  "Telefon: 05xx xxx xx xx\nInstagram: @magazaadi\nAdres: İstanbul",
];

const defaultRecipient = (): GeliverRecipientAddress => ({
  addressName: "",
  fullName: "",
  phone: "",
  email: "",
  address1: "",
  neighborhoodName: "",
  cityName: "İstanbul",
  cityCode: "34",
  districtName: "",
  districtCode: "",
  zip: "",
});

const defaultSender = (): GeliverRecipientAddress => ({
  addressName: "",
  fullName: "",
  phone: "",
  email: "",
  address1: "",
  neighborhoodName: "",
  cityName: "İstanbul",
  cityCode: "34",
  districtName: "",
  districtCode: "",
  zip: "",
});

const defaultParcel = (): GeliverParcel => ({
  length: 40,
  width: 30,
  height: 20,
  weight: 5,
});

export const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
export const getToday = () => new Date().toISOString().slice(0, 10);

const createEmptyRow = (category: string): QuoteRow => ({
  id: generateId(),
  category,
  product: "",
  description: "",
  purchasePrice: 0,
  salePrice: 0,
});

export const createDefaultRows = () => DEFAULT_ROW_CATEGORIES.map(createEmptyRow);

const nextQuoteNumber = () => `TKL-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

export const createEmptyQuote = (): Quote => {
  const now = new Date().toISOString();

  return {
    id: generateId(),
    customerName: "",
    date: getToday(),
    quoteNo: nextQuoteNumber(),
    status: DEFAULT_STATUS,
    notes: "",
    warrantyInfo: "Test edildi, temiz ve sorunsuz çalışmaktadır.",
    sellerInfo: DEFAULT_SELLER_INFO,
    companyName: DEFAULT_COMPANY_NAME,
    companyLogo: "",
    rows: createDefaultRows(),
    labor: 0,
    shipping: 0,
    discount: 0,
    cashPrice: 0,
    tradePrice: 0,
    salesPrice: 0,
    costPrice: 0,
    geliverSender: defaultSender(),
    geliverRecipient: defaultRecipient(),
    geliverParcel: defaultParcel(),
    geliverProviderServiceCode: "SURAT_STANDART",
    geliverSourceIdentifier: "https://geliver.io",
    geliverShipment: null,
    createdAt: now,
    updatedAt: now,
  };
};

export const sanitizeNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (status: string): QuoteStatus => {
  switch (status) {
    case "Yeni Teklif":
      return "Yeni Teklif";
    case "Onay Bekliyor":
      return "Onay Bekliyor";
    case "Ödeme Alındı":
    case "Odeme Alindi":
      return "Ödeme Alındı";
    case "Hazırlanıyor":
    case "Hazir":
    case "Toplaniyor":
    case "Toplanıyor":
      return "Hazırlanıyor";
    case "Kargolandı":
      return "Kargolandı";
    case "Teslim Edildi":
      return "Teslim Edildi";
    case "Tamamlandı":
    case "Satildi":
    case "Satıldı":
      return "Tamamlandı";
    case "İptal":
    case "Iptal":
      return "İptal";
    case "Rezerve":
      return "Onay Bekliyor";
    case "Testte":
      return "Hazırlanıyor";
    default:
      return DEFAULT_STATUS;
  }
};

const sanitizeRow = (row: Partial<QuoteRow> & { price?: number } = {}): QuoteRow => ({
  id: row.id || generateId(),
  category: String(row.category || ""),
  product: String(row.product || ""),
  description: String(row.description || ""),
  purchasePrice: sanitizeNumber(row.purchasePrice),
  salePrice: sanitizeNumber(row.salePrice ?? row.price),
});

export const sanitizeQuote = (input: Quote): Quote => {
  const fallback = createEmptyQuote();
  const quote = input || fallback;
  const rows = Array.isArray(quote.rows) ? quote.rows : [];

  return {
    ...fallback,
    ...quote,
    status: normalizeStatus(String(quote.status || DEFAULT_STATUS)),
    companyName:
      !quote.companyName || LEGACY_COMPANY_NAMES.includes(quote.companyName)
        ? DEFAULT_COMPANY_NAME
        : quote.companyName,
    sellerInfo:
      !quote.sellerInfo || LEGACY_SELLER_INFOS.includes(quote.sellerInfo)
        ? DEFAULT_SELLER_INFO
        : quote.sellerInfo,
    rows: rows.length > 0 ? rows.map((row) => sanitizeRow(row)) : createDefaultRows(),
    labor: sanitizeNumber(quote.labor),
    shipping: sanitizeNumber(quote.shipping),
    discount: sanitizeNumber(quote.discount),
    cashPrice: sanitizeNumber(quote.cashPrice),
    tradePrice: sanitizeNumber(quote.tradePrice),
    salesPrice: sanitizeNumber(quote.salesPrice),
    costPrice: sanitizeNumber(quote.costPrice),
    geliverSender: {
      ...defaultSender(),
      ...(quote.geliverSender || {}),
      addressName: quote.geliverSender?.addressName || "",
    },
    geliverRecipient: {
      ...defaultRecipient(),
      ...(quote.geliverRecipient || {}),
      addressName: quote.geliverRecipient?.addressName || "",
    },
    geliverParcel: {
      ...defaultParcel(),
      ...(quote.geliverParcel || {}),
      length: sanitizeNumber(quote.geliverParcel?.length),
      width: sanitizeNumber(quote.geliverParcel?.width),
      height: sanitizeNumber(quote.geliverParcel?.height),
      weight: sanitizeNumber(quote.geliverParcel?.weight),
    },
    geliverProviderServiceCode: quote.geliverProviderServiceCode || "SURAT_STANDART",
    geliverSourceIdentifier: quote.geliverSourceIdentifier || "https://geliver.io",
    geliverShipment: quote.geliverShipment
      ? {
          ...quote.geliverShipment,
          agreementCode: quote.geliverShipment.agreementCode || "",
          agreementText: quote.geliverShipment.agreementText || "",
          shipmentPrice: sanitizeNumber(quote.geliverShipment.shipmentPrice),
        }
      : null,
    createdAt: quote.createdAt || fallback.createdAt,
    updatedAt: quote.updatedAt || fallback.updatedAt,
  };
};

export const calculatePartsTotal = (rows: QuoteRow[]) =>
  rows.reduce((sum, row) => sum + sanitizeNumber(row.salePrice), 0);

export const calculatePartsCostTotal = (rows: QuoteRow[]) =>
  rows.reduce((sum, row) => sum + sanitizeNumber(row.purchasePrice), 0);

export const calculateGrandTotal = (quote: Quote) => {
  const safeQuote = sanitizeQuote(quote);
  return calculatePartsTotal(safeQuote.rows) + safeQuote.labor + safeQuote.shipping - safeQuote.discount;
};

export const calculateEstimatedProfit = (quote: Quote) =>
  sanitizeNumber(quote.salesPrice || calculateGrandTotal(quote)) -
  (calculatePartsCostTotal(quote.rows) + sanitizeNumber(quote.costPrice));

export const cloneQuote = (quote: Quote): Quote => {
  const now = new Date().toISOString();
  const safeQuote = sanitizeQuote(quote);

  return {
    ...safeQuote,
    id: generateId(),
    quoteNo: nextQuoteNumber(),
    createdAt: now,
    updatedAt: now,
    rows: safeQuote.rows.map((row) => ({
      ...row,
      id: generateId(),
    })),
  };
};

export const touchQuote = (quote: Quote): Quote => ({
  ...sanitizeQuote(quote),
  updatedAt: new Date().toISOString(),
});
