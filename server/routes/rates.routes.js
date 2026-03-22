import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const ratesRouter = Router();

let cachedRates = null;
let lastRatesFetch = 0;

ratesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const now = Date.now();
    if (cachedRates && (now - lastRatesFetch < 1000 * 60 * 60)) {
      return res.json({ rates: cachedRates });
    }
    
    const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml");
    const xml = await response.text();
    
    const extractAnyRate = (currencyCode) => {
      const blockRegex = new RegExp(`<Currency[^>]*CurrencyCode="${currencyCode}"[^>]*>([\\s\\S]*?)</Currency>`, 'i');
      const blockMatch = xml.match(blockRegex);
      if (!blockMatch) return null;
      const rateMatch = blockMatch[1].match(/<(BanknoteSelling|ForexSelling)>([\\d\\.]+)/i);
      return rateMatch ? parseFloat(rateMatch[2]) : null;
    };

    const rates = {
      TRY: 1,
      USD: extractAnyRate("USD") || 34.00,
      EUR: extractAnyRate("EUR") || 37.00,
      GBP: extractAnyRate("GBP") || 44.00,
    };
    
    cachedRates = rates;
    lastRatesFetch = now;
    return res.json({ rates });
  } catch (error) {
    return res.status(500).json({ error: "Kurlar çekilemedi" });
  }
});
