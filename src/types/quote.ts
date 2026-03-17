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

export interface ShipmentRecord {
  id: string;
  standalone: boolean;
  quoteId: string;
  quoteNo: string;
  customerName: string;
  companyName: string;
  recipientName: string;
  providerName: string;
  createdAt: string;
  updatedAt: string;
  shipment: GeliverShipment;
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
  balance: number;
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
  paymentAccountName: string;
  paymentIban: string;
  createdAt: string;
}

export type DepositRequestStatus = "pending" | "approved" | "rejected";

export interface DepositRequest {
  id: string;
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string;
  amount: number;
  note: string;
  status: DepositRequestStatus;
  approvedByUserId: string;
  approvedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletSummary {
  balance: number;
  requests: DepositRequest[];
}

export type NotificationType =
  | "deposit_request_created"
  | "deposit_request_approved"
  | "deposit_request_rejected"
  | "low_balance";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string;
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
