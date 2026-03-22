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
    
    const response = await fetch("https://api.frankfurter.dev/v1/latest?base=TRY&symbols=USD,EUR,GBP");
    const data = await response.json();
    
    if (!data || !data.rates) {
      throw new Error("API hatası");
    }

    const rates = {
      TRY: 1,
      USD: data.rates.USD ? 1 / data.rates.USD : 34.00,
      EUR: data.rates.EUR ? 1 / data.rates.EUR : 37.00,
      GBP: data.rates.GBP ? 1 / data.rates.GBP : 44.00,
    };
    
    cachedRates = rates;
    lastRatesFetch = now;
    return res.json({ rates });
  } catch (error) {
    console.error("Rates error:", error);
    return res.status(500).json({ error: "Kurlar çekilemedi" });
  }
});
