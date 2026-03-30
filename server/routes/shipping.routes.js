import { Router } from "express";
import {
  listShipmentRecordsForUser,
  saveShipmentRecordForUser,
  deleteShipmentRecordForUser,
  createShipmentAuditLogForUser
} from "../services/shippingService.js";
import { consumeUserBalance } from "../services/walletService.js";
import {
  normalizePhone,
  normalizeTurkishLocationName,
  safeJsonParse,
  toNumber,
  roundCurrency
} from "../helpers.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { turkeyCities } from "../turkeyCities.js";

const apiBaseUrl = process.env.GELIVER_API_BASE_URL || "https://api.geliver.io/api/v1";
const turkeyGeoApiBaseUrl = "https://beterali.com/api/v1";
const minimumShippingBalance = 150;
const nonPlatformShippingMarkupRate = 0.2;

export const shippingRouter = Router();

shippingRouter.get("/shipment-records", requireAuth, async (req, res) => {
  res.json({ shipments: await listShipmentRecordsForUser(req.user) });
});

shippingRouter.post("/shipment-records", requireAuth, async (req, res) => {
  const shipment = req.body?.shipment;
  if (!shipment?.shipment && !shipment?.trackingNumber) {
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

shippingRouter.delete("/shipment-records/:id", requireAuth, async (req, res) => {
  await deleteShipmentRecordForUser(req.user, req.params.id);
  return res.json({ ok: true });
});

shippingRouter.get("/geliver/health", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.GELIVER_API_TOKEN),
  });
});

shippingRouter.get("/geliver/default-sender", requireAuth, (_req, res) => {
  res.json({
    sender: buildSenderAddressFromEnv(),
  });
});

shippingRouter.get("/geliver/provider-services", requireAuth, async (_req, res) => {
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

shippingRouter.get("/geliver/locations/cities", requireAuth, async (_req, res) => {
  try {
    return res.json({ cities: await loadCities() });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Şehir listesi alınamadı.",
    });
  }
});

shippingRouter.get("/geliver/locations/districts", requireAuth, async (req, res) => {
  try {
    return res.json({ districts: await loadDistricts(String(req.query.cityCode || "")) });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "İlçe listesi alınamadı.",
    });
  }
});

shippingRouter.get("/geliver/locations/neighborhoods", requireAuth, async (req, res) => {
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

shippingRouter.post("/geliver/create-transaction", requireAuth, async (req, res) => {
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
    const chargedEstimatedPrice = calculateChargedShippingAmount(estimatedPrice, req.user);

    if (!req.user.isPlatformAdmin && Number(req.user.balance || 0) < minimumShippingBalance) {
      return res.status(400).json({
        error: `Kargo kodu oluşturmak için minimum bakiye ${minimumShippingBalance} TL olmalıdır.`,
      });
    }

    if (!req.user.isPlatformAdmin && chargedEstimatedPrice > Number(req.user.balance || 0)) {
      return res.status(400).json({
        error: `Bakiyeniz yetersiz. Gerekli yaklaşık tutar: ${chargedEstimatedPrice.toFixed(2)} TL`,
      });
    }

    const transactionResponse = await acceptOfferById(getOfferId(selectedOffer));
    const shipment = normalizeShipmentResponse(transactionResponse);
    const chargedShipmentPrice = calculateChargedShippingAmount(shipment.shipmentPrice || estimatedPrice, req.user);
    const responseShipment = req.user.isPlatformAdmin
      ? shipment
      : {
          ...shipment,
          shipmentPrice: chargedShipmentPrice,
        };

    if (!req.user.isPlatformAdmin) {
      await consumeUserBalance(req.user.id, chargedShipmentPrice);
    }

    await createShipmentAuditLogForUser(req.user, quote.quoteNo || quote.id || "", responseShipment);

    return res.json({ shipment: responseShipment });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Geliver işlemi sırasında hata oluştu.",
    });
  }
});

/* =========================================================
   GELIVER HELPERS
========================================================= */

function calculateChargedShippingAmount(baseAmount, user) {
  const numericBaseAmount = Number(baseAmount || 0);
  if (!Number.isFinite(numericBaseAmount) || numericBaseAmount <= 0) {
    return 0;
  }
  if (user?.isPlatformAdmin) {
    return roundCurrency(numericBaseAmount);
  }
  return roundCurrency(numericBaseAmount * (1 + nonPlatformShippingMarkupRate));
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
  if (!sender) return null;
  if (!sender.fullName || !sender.phone || !sender.address1 || !sender.cityCode || !sender.districtName) return null;

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
      sourceIdentifier: quote.geliverSourceIdentifier || process.env.GELIVER_DEFAULT_SOURCE_IDENTIFIER || "https://geliver.io",
      totalAmount: grandTotal,
      totalAmountCurrency: "TRY",
    },
  };
}

async function loadCities() {
  return turkeyCities;
}

async function loadDistricts(cityCode) {
  if (!cityCode) throw new Error("cityCode zorunludur.");
  const payload = await turkeyGeoRequest(`/districts?city_code=${encodeURIComponent(cityCode)}`);
  const districts = Array.isArray(payload) ? payload : payload.data?.districts || payload.districts || payload.data || [];
  return districts.map((district) => ({
    code: String(district.district_code || district.districts_code || district.code || district.id || ""),
    name: district.district_name || district.districts_name || district.name || district.districtName || "",
  }));
}

async function loadNeighborhoods(_cityCode, districtCode) {
  if (!districtCode) throw new Error("districtCode zorunludur.");
  const payload = await turkeyGeoRequest(`/neighbourhoods?districts_code=${encodeURIComponent(districtCode)}`);
  const neighborhoods = Array.isArray(payload)
    ? payload
    : payload.data?.neighbourhoods || payload.neighborhoods || payload.data || [];

  return neighborhoods.map((neighborhood) => ({
    code: String(neighborhood.neighbourhood_code || neighborhood.neighbourhoods_code || neighborhood.code || neighborhood.id || ""),
    name: neighborhood.neighbourhood_name || neighborhood.neighbourhoods_name || neighborhood.name || neighborhood.neighborhoodName || "",
  }));
}

async function turkeyGeoRequest(path) {
  const response = await fetch(`${turkeyGeoApiBaseUrl}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
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
      ...(init?.headers || {}),
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
  if (!offers.length) throw new Error("Offer ID (Teklif ID'si) belirtilmedi");
  const selectedOffer = offers.find((offer) => getOfferServiceCode(offer) === requestedProviderServiceCode) || offers[0];
  const offerId = getOfferId(selectedOffer);
  if (!offerId) throw new Error("Offer ID (Teklif ID'si) bulunamadı");
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
    offer?.totalAmount, offer?.amount, offer?.price, offer?.price?.amount, offer?.price?.value,
    offer?.totalPrice, offer?.totalPrice?.amount, offer?.pricing?.totalAmount, offer?.pricing?.amount,
  ];
  for (const candidate of candidates) {
    const parsed = toNumber(candidate);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function unwrapPayload(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if ("data" in payload && payload.data) return payload.data;
  return payload;
}

function normalizeShipmentResponse(raw) {
  const transaction = raw.transaction || raw;
  const shipment = transaction.shipment || raw.shipment || raw;
  const acceptedOffer = transaction.acceptedOffer || shipment.acceptedOffer || shipment.offer || {};
  const shipmentPrice = extractShipmentPrice(raw, transaction, shipment, acceptedOffer);
  const providerName = acceptedOffer.providerName || shipment.providerName || acceptedOffer.courierName || "Geliver";
  const providerServiceCode = acceptedOffer.providerServiceCode || shipment.providerServiceCode || acceptedOffer.serviceCode || "";
  const agreementCode = acceptedOffer.agreementCode || acceptedOffer.contractCode || acceptedOffer.contractNumber || acceptedOffer.providerAccountCode || shipment.agreementCode || shipment.contractCode || "";

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
    acceptedOffer?.totalAmount, acceptedOffer?.amount, acceptedOffer?.price, acceptedOffer?.price?.amount,
    acceptedOffer?.price?.value, acceptedOffer?.totalPrice, acceptedOffer?.totalPrice?.amount,
    acceptedOffer?.pricing?.totalAmount, acceptedOffer?.pricing?.amount, acceptedOffer?.pricing?.price,
    shipment?.totalAmount, shipment?.amount, shipment?.price, shipment?.price?.amount, shipment?.price?.value,
    shipment?.totalPrice, shipment?.totalPrice?.amount, shipment?.pricing?.totalAmount, shipment?.pricing?.amount,
    transaction?.totalAmount, transaction?.amount, transaction?.price, transaction?.price?.amount, transaction?.price?.value,
    transaction?.totalPrice, transaction?.totalPrice?.amount, raw?.totalAmount, raw?.amount, raw?.price,
    raw?.price?.amount, raw?.price?.value, raw?.totalPrice, raw?.totalPrice?.amount,
  ];

  for (const candidate of candidates) {
    const parsed = toNumber(candidate);
    if (parsed > 0) return parsed;
  }
  return 0;
}
