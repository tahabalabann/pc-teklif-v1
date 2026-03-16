export type QuoteStatus =
  | "Yeni Teklif"
  | "Onay Bekliyor"
  | "Ödeme Alındı"
  | "Hazırlanıyor"
  | "Kargolandı"
  | "Teslim Edildi"
  | "Tamamlandı"
  | "İptal";

export interface QuoteRow {
  id: string;
  category: string;
  product: string;
  description: string;
  purchasePrice: number;
  salePrice: number;
}

export interface GeliverRecipientAddress {
  addressName: string;
  fullName: string;
  phone: string;
  email: string;
  address1: string;
  neighborhoodName: string;
  cityName: string;
  cityCode: string;
  districtName: string;
  districtCode: string;
  zip: string;
}

export interface SavedRecipientAddress {
  id: string;
  label: string;
  recipient: GeliverRecipientAddress;
  createdAt: string;
  updatedAt: string;
}

export interface GeliverParcel {
  length: number;
  width: number;
  height: number;
  weight: number;
}

export interface GeliverShipment {
  transactionId: string;
  shipmentId: string;
  trackingNumber: string;
  barcode: string;
  labelUrl: string;
  providerName: string;
  providerServiceCode: string;
  agreementCode: string;
  agreementText: string;
  status: string;
  createdAt: string;
  shipmentPrice?: number;
}

export interface GeliverProviderService {
  code: string;
  name: string;
  providerName: string;
  description: string;
}

export interface LocationOption {
  code: string;
  name: string;
}

export interface Quote {
  id: string;
  customerName: string;
  date: string;
  quoteNo: string;
  status: QuoteStatus;
  notes: string;
  warrantyInfo: string;
  sellerInfo: string;
  companyName: string;
  companyLogo: string;
  rows: QuoteRow[];
  labor: number;
  shipping: number;
  discount: number;
  cashPrice: number;
  tradePrice: number;
  salesPrice: number;
  costPrice: number;
  geliverSender: GeliverRecipientAddress;
  geliverRecipient: GeliverRecipientAddress;
  geliverParcel: GeliverParcel;
  geliverProviderServiceCode: string;
  geliverSourceIdentifier: string;
  geliverShipment: GeliverShipment | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteTemplate {
  id: string;
  name: string;
  description: string;
  quote: Quote;
}

export type AppMode = "admin" | "customer";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  createdAt: string;
  companyId: string;
  companyName: string;
}

export interface AuthSession {
  token: string;
  user: AppUser;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  logoUrl: string;
  phone: string;
  email: string;
  address: string;
  sellerInfo: string;
  createdAt: string;
}

export interface CompanyRecord {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  taxOffice: string;
  taxNumber: string;
  address: string;
  notes: string;
  category?: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}
