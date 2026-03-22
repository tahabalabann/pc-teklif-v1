import { Router } from "express";
import {
  listQuotesForUser,
  saveQuoteForUser,
  deleteQuoteForUser,
  getPublicQuoteById,
  updatePublicQuoteStatus,
  listProductsForUser,
  saveProductForUser,
  deleteProductForUser
} from "../store.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { eventBus } from "../utils/EventBus.js";

export const quotesRouter = Router();

quotesRouter.get("/", requireAuth, async (req, res) => {
  res.json({ quotes: await listQuotesForUser(req.user) });
});

quotesRouter.put("/:id", requireAuth, async (req, res) => {
  const quote = req.body?.quote;
  if (!quote) {
    return res.status(400).json({ error: "Güncellenecek teklif bulunamadı." });
  }

  try {
    const savedQuote = await saveQuoteForUser(req.user, { ...quote, id: req.params.id });
    eventBus.broadcast("quote_saved", { quoteId: savedQuote.id, companyId: savedQuote.companyId });
    return res.json({ quote: savedQuote });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Teklif kaydedilemedi.",
    });
  }
});

quotesRouter.delete("/:id", requireAuth, async (req, res) => {
  await deleteQuoteForUser(req.user, req.params.id);
  eventBus.broadcast("quote_deleted", { quoteId: req.params.id });
  return res.json({ ok: true });
});

// Products
quotesRouter.get("/products", requireAuth, async (req, res) => {
  res.json({ products: await listProductsForUser(req.user) });
});

quotesRouter.post("/products", requireAuth, async (req, res) => {
  const product = req.body?.product;
  if (!product?.name) {
    return res.status(400).json({ error: "Ürün adı zorunludur." });
  }

  try {
    const savedProduct = await saveProductForUser(req.user, product);
    return res.status(201).json({ product: savedProduct });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Ürün kaydedilemedi.",
    });
  }
});

quotesRouter.delete("/products/:id", requireAuth, async (req, res) => {
  await deleteProductForUser(req.user, req.params.id);
  return res.json({ ok: true });
});

// Public endpoints mapped to root in index.js for /api/public/quotes, but kept close
export const publicQuotesRouter = Router();
publicQuotesRouter.get("/:id", async (req, res) => {
  try {
    const quote = await getPublicQuoteById(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: "Teklif bulunamadı veya ulaşılamıyor." });
    }
    return res.json({ quote });
  } catch (error) {
    return res.status(500).json({ error: "Sunucu hatası" });
  }
});

publicQuotesRouter.post("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (status !== "Onaylandı" && status !== "Reddedildi") {
      return res.status(400).json({ error: "Geçersiz durum." });
    }
    const quote = await updatePublicQuoteStatus(req.params.id, status);
    eventBus.broadcast("quote_status_updated", { quoteId: quote.id, status: quote.status, companyId: quote.companyId });
    return res.json({ quote });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Teklif durumu güncellenemedi.",
    });
  }
});
