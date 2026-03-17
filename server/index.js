import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { turkeyCities } from "./turkeyCities.js";
import {
  authenticateUser,
  createOrganizationWithAdmin,
  createShipmentAuditLogForUser,
  createSessionForUser,
  createUser,
  createDepositRequestForUser,
  createManualWalletAdjustment,
  consumeUserBalance,
  deleteAddressBookEntryForUser,
  deleteCompanyForUser,
  deleteOrganizationAsPlatformAdmin,
  deleteQuoteForUser,
  deleteShipmentRecordForUser,
  deleteSenderAddressBookEntryForUser,
  deleteUserForAdmin,
  deleteSession,
  disconnectStore,
  ensureSeedAdmin,
  getCompanyReportsForUser,
  getDashboardSummaryForUser,
  getWalletSummaryForUser,
  getOrganizationForUser,
  getSessionUser,
  approveDepositRequestForUser,
  listAuditLogsForUser,
  listNotificationsForUser,
  listAddressBookForUser,
  listCompaniesForUser,
  listDepositRequestsForUser,
  listOrganizationsForPlatformAdmin,
  listUsersForOrganizationAsPlatformAdmin,
  listUsersForDashboard,
  listWalletLedgerForUser,
  listQuotesForUser,
  listShipmentRecordsForUser,
  listSenderAddressBookForUser,
  listUsers,
  markAllNotificationsReadForUser,
  rejectDepositRequestForUser,
  saveAddressBookEntryForUser,
  saveCompanyForUser,
  saveQuoteForUser,
  saveShipmentRecordForUser,
  saveSenderAddressBookEntryForUser,
  toggleOrganizationActiveAsPlatformAdmin,
  toggleUserActiveForAdmin,
  updateOrganizationAsPlatformAdmin,
  updateOrganizationForUser,
} from "./store.js";

const app = express();
const port = Number(process.env.PORT || 8787);
const apiBaseUrl = process.env.GELIVER_API_BASE_URL || "https://api.geliver.io/api/v1";
const turkeyGeoApiBaseUrl = "https://beterali.com/api/v1";
const minimumShippingBalance = 150;

app.set("trust proxy", 1);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const authorization = req.headers.authorization || "";
      const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
      return token || req.ip || "anonymous";
    },
    message: { error: "Çok fazla istek gönderildi. Lütfen bir süre sonra tekrar deneyin." },
  }),
);

await ensureSeedAdmin();

app.use(express.json({ limit: "1mb" }));

app.get("/api/geliver/health", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.GELIVER_API_TOKEN),
  });
});

app.get("/api/geliver/default-sender", requireAuth, (_req, res) => {
  res.json({
    sender: buildSenderAddressFromEnv(),
  });
});

app.get("/api/auth/session", requireAuth, (req, res) => {
  res.json({
    token: req.sessionToken,
    user: req.user,
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "E-posta ve parola zorunludur." });
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: "E-posta veya parola hatalı." });
  }

  const token = await createSessionForUser(user);
  return res.json({ token, user });
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  await deleteSession(req.sessionToken);
  res.json({ ok: true });
});

app.get("/api/users", requireAuth, requireAdmin, async (req, res) => {
  res.json({ users: await listUsers(req.user) });
});

app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body ?? {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Ad, e-posta ve parola zorunludur." });
    }

    const user = await createUser({
      name,
      email,
      password,
      role,
      companyId: req.user.companyId,
      actorUser: req.user,
    });

    return res.status(201).json({ user });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Kullanıcı oluşturulamadı.",
    });
  }
});

app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteUserForAdmin(req.user, req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Kullanıcı silinemedi.",
    });
  }
});

app.put("/api/users/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await toggleUserActiveForAdmin(req.user, req.params.id, Boolean(req.body?.isActive));
    return res.json({ user });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Kullanıcı durumu güncellenemedi.",
    });
  }
});

app.get("/api/platform/organizations", requireAuth, requirePlatformAdmin, async (_req, res) => {
  res.json({ organizations: await listOrganizationsForPlatformAdmin() });
});

app.post("/api/platform/organizations", requireAuth, requirePlatformAdmin, async (req, res) => {
  try {
    const organization = await createOrganizationWithAdmin({
      companyName: req.body?.companyName,
      adminName: req.body?.adminName,
      adminEmail: req.body?.adminEmail,
      adminPassword: req.body?.adminPassword,
    });

    return res.status(201).json({ organization });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma oluşturulamadı.",
    });
  }
});

app.get("/api/platform/organizations/:id/users", requireAuth, requirePlatformAdmin, async (req, res) => {
  try {
    const users = await listUsersForOrganizationAsPlatformAdmin(req.params.id);
    return res.json({ users });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma kullanıcıları alınamadı.",
    });
  }
});

app.put("/api/platform/organizations/:id", requireAuth, requirePlatformAdmin, async (req, res) => {
  try {
    const organization = await updateOrganizationAsPlatformAdmin(req.params.id, req.body || {});
    return res.json({ organization });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma güncellenemedi.",
    });
  }
});

app.delete("/api/platform/organizations/:id", requireAuth, requirePlatformAdmin, async (req, res) => {
  try {
    await deleteOrganizationAsPlatformAdmin(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma silinemedi.",
    });
  }
});

app.put("/api/platform/organizations/:id/status", requireAuth, requirePlatformAdmin, async (req, res) => {
  try {
    const organization = await toggleOrganizationActiveAsPlatformAdmin(
      req.params.id,
      Boolean(req.body?.isActive),
    );
    return res.json({ organization });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma durumu güncellenemedi.",
    });
  }
});

app.get("/api/reports/dashboard", requireAuth, requireAdmin, async (req, res) => {
  try {
    const summary = await getDashboardSummaryForUser(req.user);
    return res.json({ summary });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Dashboard özeti alınamadı.",
    });
  }
});

app.get("/api/reports/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await listUsersForDashboard(req.user);
    return res.json({ users });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Dashboard kullanıcıları alınamadı.",
    });
  }
});

app.get("/api/reports/companies", requireAuth, requireAdmin, async (req, res) => {
  try {
    const reports = await getCompanyReportsForUser(req.user);
    return res.json({ reports });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma raporları alınamadı.",
    });
  }
});

app.get("/api/reports/audit-logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const logs = await listAuditLogsForUser(req.user);
    return res.json({ logs });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Hareket geçmişi alınamadı.",
    });
  }
});

app.get("/api/reports/wallet-ledger", requireAuth, requireAdmin, async (req, res) => {
  try {
    const entries = await listWalletLedgerForUser(req.user);
    return res.json({ entries });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye hareketleri alınamadı.",
    });
  }
});

app.post("/api/reports/wallet-ledger/manual-adjustment", requireAuth, requireAdmin, async (req, res) => {
  try {
    const balance = await createManualWalletAdjustment(req.user, {
      userId: req.body?.userId,
      amount: req.body?.amount,
      note: req.body?.note,
    });
    return res.json({ balance });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Manuel bakiye işlemi yapılamadı.",
    });
  }
});

app.get("/api/settings/company", requireAuth, async (req, res) => {
  try {
    const company = await getOrganizationForUser(req.user);
    return res.json({ company });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma ayarları alınamadı.",
    });
  }
});

app.put("/api/settings/company", requireAuth, requireAdmin, async (req, res) => {
  try {
    const company = await updateOrganizationForUser(req.user, req.body?.company || {});
    return res.json({ company });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma ayarları güncellenemedi.",
    });
  }
});

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const notifications = await listNotificationsForUser(req.user);
    return res.json({ notifications });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bildirimler alınamadı.",
    });
  }
});

app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await markAllNotificationsReadForUser(req.user);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bildirimler güncellenemedi.",
    });
  }
});

app.get("/api/wallet/summary", requireAuth, async (req, res) => {
  try {
    const wallet = await getWalletSummaryForUser(req.user);
    return res.json({ wallet });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye özeti alınamadı.",
    });
  }
});

app.get("/api/wallet/deposit-requests", requireAuth, async (req, res) => {
  try {
    const requests = await listDepositRequestsForUser(req.user);
    return res.json({ requests });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye talepleri alınamadı.",
    });
  }
});

app.post("/api/wallet/deposit-requests", requireAuth, async (req, res) => {
  try {
    const request = await createDepositRequestForUser(req.user, {
      amount: req.body?.amount,
      note: req.body?.note,
    });
    return res.status(201).json({ request });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye talebi oluşturulamadı.",
    });
  }
});

app.post("/api/wallet/deposit-requests/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await approveDepositRequestForUser(req.user, req.params.id);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye talebi onaylanamadı.",
    });
  }
});

app.post("/api/wallet/deposit-requests/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const request = await rejectDepositRequestForUser(req.user, req.params.id);
    return res.json({ request });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye talebi reddedilemedi.",
    });
  }
});

app.get("/api/quotes", requireAuth, async (req, res) => {
  res.json({ quotes: await listQuotesForUser(req.user) });
});

app.put("/api/quotes/:id", requireAuth, async (req, res) => {
  const quote = req.body?.quote;
  if (!quote) {
    return res.status(400).json({ error: "Güncellenecek teklif bulunamadı." });
  }

  try {
    const savedQuote = await saveQuoteForUser(req.user, { ...quote, id: req.params.id });
    return res.json({ quote: savedQuote });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Teklif kaydedilemedi.",
    });
  }
});

app.delete("/api/quotes/:id", requireAuth, async (req, res) => {
  await deleteQuoteForUser(req.user, req.params.id);
  return res.json({ ok: true });
});

app.get("/api/address-book", requireAuth, async (req, res) => {
  res.json({ addresses: await listAddressBookForUser(req.user) });
});

app.post("/api/address-book", requireAuth, async (req, res) => {
  const label = String(req.body?.label || "").trim();
  const recipient = req.body?.recipient;

  if (!label || !recipient) {
    return res.status(400).json({ error: "Adres etiketi ve adres bilgisi zorunludur." });
  }

  try {
    const address = await saveAddressBookEntryForUser(req.user, { label, recipient });
    return res.status(201).json({ address });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Adres kaydedilemedi.",
    });
  }
});

app.delete("/api/address-book/:id", requireAuth, async (req, res) => {
  await deleteAddressBookEntryForUser(req.user, req.params.id);
  return res.json({ ok: true });
});

app.get("/api/sender-address-book", requireAuth, async (req, res) => {
  res.json({ addresses: await listSenderAddressBookForUser(req.user) });
});

app.post("/api/sender-address-book", requireAuth, async (req, res) => {
  const label = String(req.body?.label || "").trim();
  const recipient = req.body?.recipient;

  if (!label || !recipient) {
    return res.status(400).json({ error: "Gönderici etiketi ve adres bilgisi zorunludur." });
  }

  try {
    const address = await saveSenderAddressBookEntryForUser(req.user, { label, recipient });
    return res.status(201).json({ address });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Gönderici adresi kaydedilemedi.",
    });
  }
});

app.delete("/api/sender-address-book/:id", requireAuth, async (req, res) => {
  await deleteSenderAddressBookEntryForUser(req.user, req.params.id);
  return res.json({ ok: true });
});

app.get("/api/companies", requireAuth, async (req, res) => {
  res.json({ companies: await listCompaniesForUser(req.user) });
});

app.get("/api/shipment-records", requireAuth, async (req, res) => {
  res.json({ shipments: await listShipmentRecordsForUser(req.user) });
});

app.post("/api/shipment-records", requireAuth, async (req, res) => {
  const shipment = req.body?.shipment;
  if (!shipment?.shipment) {
    return res.status(400).json({ error: "Kargo kaydı bulunamadı." });
  }

  try {
    const savedShipment = await saveShipmentRecordForUser(req.user, shipment);
    return res.status(201).json({ shipment: savedShipment });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Kargo kaydı kaydedilemedi.",
    });
  }
});

app.delete("/api/shipment-records/:id", requireAuth, async (req, res) => {
  await deleteShipmentRecordForUser(req.user, req.params.id);
  return res.json({ ok: true });
});

app.post("/api/companies", requireAuth, async (req, res) => {
  const company = req.body?.company;
  if (!company?.companyName) {
    return res.status(400).json({ error: "Firma adı zorunludur." });
  }

  try {
    const savedCompany = await saveCompanyForUser(req.user, company);
    return res.status(201).json({ company: savedCompany });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma kaydı kaydedilemedi.",
    });
  }
});

app.delete("/api/companies/:id", requireAuth, async (req, res) => {
  await deleteCompanyForUser(req.user, req.params.id);
  return res.json({ ok: true });
});

app.get("/api/geliver/provider-services", requireAuth, async (_req, res) => {
  try {
    const payload = await geliverRequest("/providerservices", { method: "GET" });
    const services = Array.isArray(payload) ? payload : payload.items || payload.services || [];
    return res.json({
      services: services.map((service) => ({
        code: service.code || service.providerServiceCode || service.serviceCode || "",
        name: service.name || service.displayName || service.title || "",
        providerName: service.providerName || service.provider || "",
        description: service.description || service.providerDescription || "",
      })),
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Kargo servisleri alınamadı.",
    });
  }
});

app.get("/api/geliver/locations/cities", requireAuth, async (_req, res) => {
  try {
    return res.json({ cities: await loadCities() });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Şehir listesi alınamadı.",
    });
  }
});

app.get("/api/geliver/locations/districts", requireAuth, async (req, res) => {
  try {
    return res.json({ districts: await loadDistricts(String(req.query.cityCode || "")) });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "İlçe listesi alınamadı.",
    });
  }
});

app.get("/api/geliver/locations/neighborhoods", requireAuth, async (req, res) => {
  try {
    return res.json({
      neighborhoods: await loadNeighborhoods(String(req.query.cityCode || ""), String(req.query.districtCode || "")),
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Mahalle listesi alınamadı.",
    });
  }
});

app.post("/api/geliver/create-transaction", requireAuth, async (req, res) => {
  try {
    if (!process.env.GELIVER_API_TOKEN) {
      return res.status(500).json({
        error: "GELIVER_API_TOKEN tanımlı değil. .env dosyasını doldurmanız gerekiyor.",
      });
    }

    const quote = req.body?.quote;
    if (!quote) {
      return res.status(400).json({ error: "Teklif verisi gönderilmedi." });
    }

    const senderAddress = buildSenderAddressFromQuote(quote) || buildSenderAddressFromEnv();
    const sender = await createSenderAddress(senderAddress);
    const shipmentDraft = await geliverRequest("/shipments", {
      method: "POST",
      body: JSON.stringify(buildShipmentPayload(quote, sender.id || sender.addressID || sender.senderAddressID)),
    });

    const selectedOffer = selectRequestedOffer(shipmentDraft, quote.geliverProviderServiceCode);
    const estimatedPrice = extractOfferAmount(selectedOffer);

    if (req.user.role !== "admin" && Number(req.user.balance || 0) < minimumShippingBalance) {
      return res.status(400).json({
        error: `Kargo kodu oluşturmak için minimum bakiye ${minimumShippingBalance} TL olmalıdır.`,
      });
    }

    if (req.user.role !== "admin" && estimatedPrice > Number(req.user.balance || 0)) {
      return res.status(400).json({
        error: `Bakiyeniz yetersiz. Gerekli yaklaşık tutar: ${estimatedPrice.toFixed(2)} TL`,
      });
    }

    const transactionResponse = await acceptOfferById(getOfferId(selectedOffer));
    const shipment = normalizeShipmentResponse(transactionResponse);

    if (req.user.role !== "admin") {
      await consumeUserBalance(req.user.id, shipment.shipmentPrice || estimatedPrice);
    }

    await createShipmentAuditLogForUser(req.user, quote.quoteNo || quote.id || "", shipment);

    return res.json({ shipment });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Geliver işlemi sırasında hata oluştu.",
    });
  }
});

const server = app.listen(port, () => {
  console.log(`Team server running on http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  await disconnectStore();
  server.close(() => process.exit(0));
});

function requireAuth(req, res, next) {
  void (async () => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
      return res.status(401).json({ error: "Oturum bulunamadı." });
    }

    const session = await getSessionUser(token);
    if (!session) {
      return res.status(401).json({ error: "Oturum bulunamadı." });
    }

    req.sessionToken = session.token;
    req.user = session.user;
    next();
  })().catch((error) => {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Oturum doğrulanamadı.",
    });
  });
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Bu işlem için admin yetkisi gerekiyor." });
  }

  next();
}

function requirePlatformAdmin(req, res, next) {
  if (!req.user?.isPlatformAdmin) {
    return res.status(403).json({ error: "Bu işlem için platform admin yetkisi gerekiyor." });
  }

  next();
}

async function createSenderAddress(address) {
  return geliverRequest("/addresses", {
    method: "POST",
    body: JSON.stringify({
      name: address.addressName || process.env.GELIVER_SENDER_ADDRESS_NAME || "Mağaza",
      ...address,
      isDefaultSenderAddress: true,
    }),
  });
}

function buildSenderAddressFromEnv() {
  const required = [
    "GELIVER_SENDER_NAME",
    "GELIVER_SENDER_EMAIL",
    "GELIVER_SENDER_PHONE",
    "GELIVER_SENDER_ADDRESS1",
    "GELIVER_SENDER_CITY_NAME",
    "GELIVER_SENDER_CITY_CODE",
    "GELIVER_SENDER_DISTRICT_NAME",
    "GELIVER_SENDER_ZIP",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`${key} eksik. Gönderici adresi için .env dosyasını doldurun.`);
    }
  }

  return {
    addressName: process.env.GELIVER_SENDER_ADDRESS_NAME || "Mağaza",
    fullName: process.env.GELIVER_SENDER_NAME,
    email: process.env.GELIVER_SENDER_EMAIL,
    phone: normalizePhone(process.env.GELIVER_SENDER_PHONE),
    address1: process.env.GELIVER_SENDER_ADDRESS1,
    cityName: normalizeTurkishLocationName(process.env.GELIVER_SENDER_CITY_NAME),
    cityCode: process.env.GELIVER_SENDER_CITY_CODE,
    districtName: normalizeTurkishLocationName(process.env.GELIVER_SENDER_DISTRICT_NAME),
    zip: process.env.GELIVER_SENDER_ZIP,
    countryCode: process.env.GELIVER_SENDER_COUNTRY_CODE || "TR",
  };
}

function buildSenderAddressFromQuote(quote) {
  const sender = quote?.geliverSender;
  if (!sender) {
    return null;
  }

  if (!sender.fullName || !sender.phone || !sender.address1 || !sender.cityCode || !sender.districtName) {
    return null;
  }

  return {
    addressName: String(sender.addressName || "Mağaza").trim(),
    fullName: sender.fullName,
    email: sender.email || process.env.GELIVER_SENDER_EMAIL,
    phone: normalizePhone(sender.phone),
    address1: sender.address1,
    cityName: normalizeTurkishLocationName(sender.cityName),
    cityCode: sender.cityCode,
    districtName: normalizeTurkishLocationName(sender.districtName),
    neighborhoodName: normalizeTurkishLocationName(sender.neighborhoodName) || undefined,
    zip: sender.zip,
    countryCode: "TR",
  };
}

function buildShipmentPayload(quote, senderAddressID) {
  const grandTotal =
    Number(quote.salesPrice) ||
    quote.rows.reduce((sum, row) => sum + Number(row.salePrice || 0), 0) +
      Number(quote.labor || 0) +
      Number(quote.shipping || 0) -
      Number(quote.discount || 0);

  return {
    senderAddressID,
    length: String(Number(quote.geliverParcel.length || 0)),
    width: String(Number(quote.geliverParcel.width || 0)),
    height: String(Number(quote.geliverParcel.height || 0)),
    distanceUnit: "cm",
    weight: String(Number(quote.geliverParcel.weight || 0)),
    massUnit: "kg",
    providerServiceCode: quote.geliverProviderServiceCode || "SURAT_STANDART",
    recipientAddress: {
      name: String(quote.geliverRecipient.addressName || "").trim() || "Ev",
      fullName: quote.geliverRecipient.fullName || quote.customerName || "Müşteri",
      email: quote.geliverRecipient.email || process.env.GELIVER_SENDER_EMAIL,
      phone: normalizePhone(quote.geliverRecipient.phone),
      address1: quote.geliverRecipient.address1,
      cityName: normalizeTurkishLocationName(quote.geliverRecipient.cityName),
      cityCode: quote.geliverRecipient.cityCode,
      districtName: normalizeTurkishLocationName(quote.geliverRecipient.districtName),
      neighborhoodName: normalizeTurkishLocationName(quote.geliverRecipient.neighborhoodName) || undefined,
      zip: quote.geliverRecipient.zip,
      countryCode: "TR",
    },
    order: {
      orderNumber: quote.quoteNo,
      sourceIdentifier:
        quote.geliverSourceIdentifier || process.env.GELIVER_DEFAULT_SOURCE_IDENTIFIER || "https://geliver.io",
      totalAmount: grandTotal,
      totalAmountCurrency: "TRY",
    },
  };
}

async function loadCities() {
  return turkeyCities;
}

async function loadDistricts(cityCode) {
  if (!cityCode) {
    throw new Error("cityCode zorunludur.");
  }

  const payload = await turkeyGeoRequest(`/districts?city_code=${encodeURIComponent(cityCode)}`);
  const districts = Array.isArray(payload) ? payload : payload.data?.districts || payload.districts || payload.data || [];
  return districts.map((district) => ({
    code: String(district.district_code || district.districts_code || district.code || district.id || ""),
    name: district.district_name || district.districts_name || district.name || district.districtName || "",
  }));
}

async function loadNeighborhoods(_cityCode, districtCode) {
  if (!districtCode) {
    throw new Error("districtCode zorunludur.");
  }

  const payload = await turkeyGeoRequest(`/neighbourhoods?districts_code=${encodeURIComponent(districtCode)}`);
  const neighborhoods = Array.isArray(payload)
    ? payload
    : payload.data?.neighbourhoods || payload.neighborhoods || payload.data || [];

  return neighborhoods.map((neighborhood) => ({
    code: String(neighborhood.neighbourhood_code || neighborhood.neighbourhoods_code || neighborhood.code || neighborhood.id || ""),
    name:
      neighborhood.neighbourhood_name ||
      neighborhood.neighbourhoods_name ||
      neighborhood.name ||
      neighborhood.neighborhoodName ||
      "",
  }));
}

async function turkeyGeoRequest(path) {
  const response = await fetch(`${turkeyGeoApiBaseUrl}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const text = await response.text();
  const payload = text ? safeJsonParse(text) : {};

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Turkey Geo API hatası: ${response.status}`);
  }

  return payload;
}

async function geliverRequest(path, init) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GELIVER_API_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  const payload = text ? safeJsonParse(text) : {};

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Geliver API hatası: ${response.status}`);
  }

  return unwrapPayload(payload);
}

function selectRequestedOffer(transactionDraft, requestedProviderServiceCode) {
  const shipment = transactionDraft?.shipment || transactionDraft?.data || transactionDraft;
  if (shipment?.acceptedOffer || shipment?.acceptedOfferID || shipment?.trackingNumber) {
    return shipment.acceptedOffer || shipment.offer;
  }

  const offers = extractOffers(transactionDraft);
  if (!offers.length) {
    throw new Error("Offer ID (Teklif ID'si) belirtilmedi");
  }

  const selectedOffer =
    offers.find((offer) => getOfferServiceCode(offer) === requestedProviderServiceCode) || offers[0];
  const offerId = getOfferId(selectedOffer);

  if (!offerId) {
    throw new Error("Offer ID (Teklif ID'si) bulunamadı");
  }

  return selectedOffer;
}

async function acceptOfferById(offerId) {
  const candidateRequests = [
    { path: "/transactions", body: { offerID: offerId } },
    { path: "/transactions", body: { offerId } },
  ];

  let lastError = null;
  for (const request of candidateRequests) {
    try {
      return await geliverRequest(request.path, {
        method: "POST",
        body: JSON.stringify(request.body),
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Geliver teklif kabul işlemi başarısız oldu.");
}

function extractOffers(raw) {
  const shipment = raw?.shipment || raw?.data || raw;
  const offerList = shipment?.offers || raw?.offers || {};
  const list = offerList?.list || offerList?.data || raw?.offerList || [];
  return Array.isArray(list) ? list : Array.isArray(offerList) ? offerList : [];
}

function getOfferId(offer) {
  return offer?.id || offer?.offerId || offer?.offerID || offer?.transactionOfferId || offer?.transactionOfferID || "";
}

function getOfferServiceCode(offer) {
  return offer?.providerServiceCode || offer?.serviceCode || offer?.code || "";
}

function extractOfferAmount(offer) {
  const candidates = [
    offer?.totalAmount,
    offer?.amount,
    offer?.price,
    offer?.price?.amount,
    offer?.price?.value,
    offer?.totalPrice,
    offer?.totalPrice?.amount,
    offer?.pricing?.totalAmount,
    offer?.pricing?.amount,
  ];

  for (const candidate of candidates) {
    const parsed = toNumber(candidate);
    if (parsed > 0) {
      return parsed;
    }
  }

  return 0;
}

function unwrapPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  if ("data" in payload && payload.data) {
    return payload.data;
  }

  return payload;
}

function normalizeShipmentResponse(raw) {
  const transaction = raw.transaction || raw;
  const shipment = transaction.shipment || raw.shipment || raw;
  const acceptedOffer = transaction.acceptedOffer || shipment.acceptedOffer || shipment.offer || {};
  const shipmentPrice = extractShipmentPrice(raw, transaction, shipment, acceptedOffer);
  const providerName = acceptedOffer.providerName || shipment.providerName || acceptedOffer.courierName || "Geliver";
  const providerServiceCode =
    acceptedOffer.providerServiceCode || shipment.providerServiceCode || acceptedOffer.serviceCode || "";
  const agreementCode =
    acceptedOffer.agreementCode ||
    acceptedOffer.contractCode ||
    acceptedOffer.contractNumber ||
    acceptedOffer.providerAccountCode ||
    shipment.agreementCode ||
    shipment.contractCode ||
    "";

  const agreementText = agreementCode
    ? `Geliver.io ${providerName} anlaşma kodu: ${agreementCode}`
    : providerName
      ? `Geliver.io ${providerName} gönderisi oluşturuldu`
      : "Geliver gönderisi oluşturuldu";

  return {
    transactionId: transaction.id || transaction.transactionID || "",
    shipmentId: shipment.id || shipment.shipmentID || "",
    trackingNumber: shipment.trackingNumber || shipment.trackingNo || transaction.trackingNumber || "",
    barcode: shipment.barcode || transaction.barcode || "",
    labelUrl: shipment.labelUrl || shipment.labelURL || transaction.labelUrl || transaction.labelURL || "",
    providerName,
    providerServiceCode,
    agreementCode,
    agreementText,
    status: shipment.status || transaction.status || "",
    createdAt: shipment.createdAt || transaction.createdAt || new Date().toISOString(),
    shipmentPrice,
  };
}

function extractShipmentPrice(raw, transaction, shipment, acceptedOffer) {
  const candidates = [
    acceptedOffer?.totalAmount,
    acceptedOffer?.amount,
    acceptedOffer?.price,
    acceptedOffer?.price?.amount,
    acceptedOffer?.price?.value,
    acceptedOffer?.totalPrice,
    acceptedOffer?.totalPrice?.amount,
    acceptedOffer?.pricing?.totalAmount,
    acceptedOffer?.pricing?.amount,
    acceptedOffer?.pricing?.price,
    shipment?.totalAmount,
    shipment?.amount,
    shipment?.price,
    shipment?.price?.amount,
    shipment?.price?.value,
    shipment?.totalPrice,
    shipment?.totalPrice?.amount,
    shipment?.pricing?.totalAmount,
    shipment?.pricing?.amount,
    transaction?.totalAmount,
    transaction?.amount,
    transaction?.price,
    transaction?.price?.amount,
    transaction?.price?.value,
    transaction?.totalPrice,
    transaction?.totalPrice?.amount,
    raw?.totalAmount,
    raw?.amount,
    raw?.price,
    raw?.price?.amount,
    raw?.price?.value,
    raw?.totalPrice,
    raw?.totalPrice?.amount,
  ];

  for (const candidate of candidates) {
    const parsed = toNumber(candidate);
    if (parsed > 0) {
      return parsed;
    }
  }

  return 0;
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return { message: value };
  }
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `+90${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `+9${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("90")) {
    return `+${digits}`;
  }
  return digits ? `+${digits}` : "";
}

function normalizeTurkishLocationName(value) {
  const source = String(value || "").trim();
  if (!source) {
    return "";
  }

  const replacements = [
    [/Istanbul/gi, "İstanbul"],
    [/Izmir/gi, "İzmir"],
    [/Cekmekoy/gi, "Çekmeköy"],
    [/Gungoren/gi, "Güngören"],
    [/Besiktas/gi, "Beşiktaş"],
    [/Sisli/gi, "Şişli"],
    [/Kadikoy/gi, "Kadıköy"],
    [/Uskudar/gi, "Üsküdar"],
  ];

  let normalized = source;
  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  if (normalized === normalized.toUpperCase()) {
    normalized = normalized
      .toLocaleLowerCase("tr-TR")
      .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("tr-TR"));
  }

  return normalized;
}
