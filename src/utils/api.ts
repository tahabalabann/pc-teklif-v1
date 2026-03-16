import type {
  AppUser,
  AuthSession,
  CompanyRecord,
  CompanySettings,
  GeliverProviderService,
  LocationOption,
  Quote,
  SavedRecipientAddress,
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
  logout: async () => {
    await apiRequest<{ ok: true }>("/api/auth/logout", { method: "POST" });
    sessionStorageApi.clearToken();
  },
};

export const usersApi = {
  list: async () => (await apiRequest<{ users: AppUser[] }>("/api/users")).users,
  create: async (payload: { name: string; email: string; password: string; role: "admin" | "staff" }) =>
    (
      await apiRequest<{ user: AppUser }>("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
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
