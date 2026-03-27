import type {
  AppUser,
  AuthSession,
  CompanyRecord,
  CompanySettings,
  CompanyReportSummary,
  DashboardSummary,
  GeliverProviderService,
  LocationOption,
  Quote,
  SavedRecipientAddress,
  ShipmentRecord,
  WalletSummary,
  DepositRequest,
  AppNotification,
  AuditLogEntry,
  OrganizationSummary,
  WalletLedgerEntry,
} from "../types/quote";

const SESSION_STORAGE_KEY = "pc-teklif:sessionToken";

export const sessionStorageApi = {
  getToken: () => window.localStorage.getItem(SESSION_STORAGE_KEY) || "",
  setToken: (token: string) => window.localStorage.setItem(SESSION_STORAGE_KEY, token),
  clearToken: () => window.localStorage.removeItem(SESSION_STORAGE_KEY),
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = sessionStorageApi.getToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  const text = await response.text();
  const payload = safeJsonParse(text) as T & { error?: string; message?: string };
  if (!response.ok) {
    throw new Error(payload.error || payload.message || "İstek başarısız oldu.");
  }

  return payload;
}

function safeJsonParse(text: string) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export const authApi = {
  getSession: () => apiRequest<AuthSession>("/api/auth/session"),
  login: async (email: string, password: string) => {
    const session = await apiRequest<AuthSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    sessionStorageApi.setToken(session.token);
    return session;
  },
  register: async (name: string, email: string, password: string) => {
    const session = await apiRequest<AuthSession>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    sessionStorageApi.setToken(session.token);
    return session;
  },
  logout: async () => {
    await apiRequest<{ ok: true }>("/api/auth/logout", { method: "POST" });
    sessionStorageApi.clearToken();
  },
};

export const usersApi = {
  list: async () => (await apiRequest<{ users: AppUser[] }>("/api/users")).users,
  create: async (payload: { name: string; email: string; password: string; role: AppUser["role"] }) =>
    (
      await apiRequest<{ user: AppUser }>("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ).user,
  delete: async (userId: string) => {
    await apiRequest<{ ok: true }>(`/api/users/${userId}`, { method: "DELETE" });
  },
  toggleActive: async (userId: string, isActive: boolean) =>
    (
      await apiRequest<{ user: AppUser }>(`/api/users/${userId}/status`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      })
    ).user,
};

export const settingsApi = {
  getCompany: async () => (await apiRequest<{ company: CompanySettings }>("/api/settings/company")).company,
  saveCompany: async (company: CompanySettings) =>
    (
      await apiRequest<{ company: CompanySettings }>("/api/settings/company", {
        method: "PUT",
        body: JSON.stringify({ company }),
      })
    ).company,
};

export const quotesApi = {
  list: async () => (await apiRequest<{ quotes: Quote[] }>("/api/quotes")).quotes,
  save: async (quote: Quote) =>
    (
      await apiRequest<{ quote: Quote }>(`/api/quotes/${quote.id}`, {
        method: "PUT",
        body: JSON.stringify({ quote }),
      })
    ).quote,
  createFromBuilder: async (selections: Record<string, string>) =>
    (
      await apiRequest<{ quote: Quote }>("/api/quotes/from-builder", {
        method: "POST",
        body: JSON.stringify({ selections }),
      })
    ).quote,
  delete: async (quoteId: string) => {
    await apiRequest<{ ok: true }>(`/api/quotes/${quoteId}`, { method: "DELETE" });
  },
};

export const geliverApi = {
  health: () => apiRequest<{ ok: boolean; configured: boolean }>("/api/geliver/health"),
  getDefaultSender: async () =>
    (await apiRequest<{ sender: Quote["geliverSender"] }>("/api/geliver/default-sender")).sender,
  listProviderServices: async () =>
    (await apiRequest<{ services: GeliverProviderService[] }>("/api/geliver/provider-services")).services,
  listCities: async () => (await apiRequest<{ cities: LocationOption[] }>("/api/geliver/locations/cities")).cities,
  listDistricts: async (cityCode: string) =>
    (
      await apiRequest<{ districts: LocationOption[] }>(
        `/api/geliver/locations/districts?cityCode=${encodeURIComponent(cityCode)}`,
      )
    ).districts,
  listNeighborhoods: async (cityCode: string, districtCode: string) =>
    (
      await apiRequest<{ neighborhoods: LocationOption[] }>(
        `/api/geliver/locations/neighborhoods?cityCode=${encodeURIComponent(cityCode)}&districtCode=${encodeURIComponent(districtCode)}`,
      )
    ).neighborhoods,
};

export const addressBookApi = {
  list: async () => (await apiRequest<{ addresses: SavedRecipientAddress[] }>("/api/address-book")).addresses,
  save: async (payload: { label: string; recipient: Quote["geliverRecipient"] }) =>
    (
      await apiRequest<{ address: SavedRecipientAddress }>("/api/address-book", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ).address,
  delete: async (addressId: string) => {
    await apiRequest<{ ok: true }>(`/api/address-book/${addressId}`, { method: "DELETE" });
  },
};

export const senderAddressBookApi = {
  list: async () => (await apiRequest<{ addresses: SavedRecipientAddress[] }>("/api/sender-address-book")).addresses,
  save: async (payload: { label: string; recipient: Quote["geliverSender"] }) =>
    (
      await apiRequest<{ address: SavedRecipientAddress }>("/api/sender-address-book", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ).address,
  delete: async (addressId: string) => {
    await apiRequest<{ ok: true }>(`/api/sender-address-book/${addressId}`, { method: "DELETE" });
  },
};

export interface CatalogProduct {
  id: string;
  category: string;
  name: string;
  description: string;
  purchasePrice: number;
  salePrice: number;
  imageUrl?: string;
  stockCount?: number;
  minStockLevel?: number;
  createdAt: string;
  updatedAt: string;
}

export const uploadApi = {
  uploadImage: async (base64: string, filename: string) =>
    (
      await apiRequest<{ url: string }>("/api/upload", {
        method: "POST",
        body: JSON.stringify({ imageBase64: base64, filename }),
      })
    ).url,
};

export const productsApi = {
  list: async () => (await apiRequest<{ products: CatalogProduct[] }>("/api/quotes/products")).products,
  save: async (product: Partial<CatalogProduct>) =>
    (
      await apiRequest<{ product: CatalogProduct }>("/api/quotes/products", {
        method: "POST",
        body: JSON.stringify({ product }),
      })
    ).product,
  delete: async (productId: string) => {
    await apiRequest<{ ok: true }>(`/api/quotes/products/${productId}`, { method: "DELETE" });
  },
};

export const companiesApi = {
  list: async () => (await apiRequest<{ companies: CompanyRecord[] }>("/api/companies")).companies,
  save: async (company: CompanyRecord) =>
    (
      await apiRequest<{ company: CompanyRecord }>("/api/companies", {
        method: "POST",
        body: JSON.stringify({ company }),
      })
    ).company,
  delete: async (companyId: string) => {
    await apiRequest<{ ok: true }>(`/api/companies/${companyId}`, { method: "DELETE" });
  },
};

export const shipmentRecordsApi = {
  list: async () => (await apiRequest<{ shipments: ShipmentRecord[] }>("/api/shipment-records")).shipments,
  save: async (shipment: ShipmentRecord) =>
    (
      await apiRequest<{ shipment: ShipmentRecord }>("/api/shipment-records", {
        method: "POST",
        body: JSON.stringify({ shipment }),
      })
    ).shipment,
  delete: async (shipmentId: string) => {
    await apiRequest<{ ok: true }>(`/api/shipment-records/${shipmentId}`, { method: "DELETE" });
  },
};

export const walletApi = {
  getSummary: async () => (await apiRequest<{ wallet: WalletSummary }>("/api/wallet/summary")).wallet,
  createRequest: async (payload: { amount: number; note: string }) =>
    (
      await apiRequest<{ request: DepositRequest }>("/api/wallet/deposit-requests", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ).request,
  listRequests: async () => (await apiRequest<{ requests: DepositRequest[] }>("/api/wallet/deposit-requests")).requests,
  approveRequest: async (requestId: string) =>
    (
      await apiRequest<{ request: DepositRequest; balance: number }>(`/api/wallet/deposit-requests/${requestId}/approve`, {
        method: "POST",
      })
    ),
  rejectRequest: async (requestId: string) =>
    (
      await apiRequest<{ request: DepositRequest }>(`/api/wallet/deposit-requests/${requestId}/reject`, {
        method: "POST",
      })
    ).request,
};

export const notificationsApi = {
  list: async () => (await apiRequest<{ notifications: AppNotification[] }>("/api/notifications")).notifications,
  markAllRead: async () => {
    await apiRequest<{ ok: true }>("/api/notifications/read-all", { method: "POST" });
  },
};

export const organizationsApi = {
  list: async () => (await apiRequest<{ organizations: OrganizationSummary[] }>("/api/platform/organizations")).organizations,
  create: async (payload: {
    companyName: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
  }) =>
    (
      await apiRequest<{ organization: OrganizationSummary }>("/api/platform/organizations", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ).organization,
  listUsers: async (organizationId: string) =>
    (
      await apiRequest<{ users: AppUser[] }>(`/api/platform/organizations/${organizationId}/users`)
    ).users,
  update: async (
    organizationId: string,
    payload: { companyName: string; phone?: string; email?: string; address?: string; notes?: string },
  ) =>
    (
      await apiRequest<{ organization: OrganizationSummary }>(`/api/platform/organizations/${organizationId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })
    ).organization,
  delete: async (organizationId: string) => {
    await apiRequest<{ ok: true }>(`/api/platform/organizations/${organizationId}`, { method: "DELETE" });
  },
  toggleActive: async (organizationId: string, isActive: boolean) =>
    (
      await apiRequest<{ organization: OrganizationSummary }>(`/api/platform/organizations/${organizationId}/status`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      })
    ).organization,
};

export const reportsApi = {
  dashboard: async () => (await apiRequest<{ summary: DashboardSummary }>("/api/reports/dashboard")).summary,
  users: async () => (await apiRequest<{ users: AppUser[] }>("/api/reports/users")).users,
  companies: async () =>
    (await apiRequest<{ reports: CompanyReportSummary[] }>("/api/reports/companies")).reports,
  auditLogs: async () => (await apiRequest<{ logs: AuditLogEntry[] }>("/api/reports/audit-logs")).logs,
  walletLedger: async () =>
    (await apiRequest<{ entries: WalletLedgerEntry[] }>("/api/reports/wallet-ledger")).entries,
  manualWalletAdjustment: async (payload: { userId: string; amount: number; note: string }) =>
    (
      await apiRequest<{ balance: number }>("/api/reports/wallet-ledger/manual-adjustment", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    ).balance,
};

export const ratesApi = {
  getRates: async () => (await apiRequest<{ rates: { TRY: number; USD: number; EUR: number; GBP: number } }>("/api/rates")).rates,
};
