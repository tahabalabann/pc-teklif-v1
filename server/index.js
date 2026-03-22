import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { disconnectStore } from "./db.js";
import { ensureSeedAdmin } from "./bootstrapStore.js";
import { logger } from "./logger.js";

// Import Routers
import { authRouter } from "./routes/auth.routes.js";
import { usersRouter } from "./routes/users.routes.js";
import { platformRouter } from "./routes/platform.routes.js";
import { reportsRouter } from "./routes/reports.routes.js";
import { settingsRouter } from "./routes/settings.routes.js";
import { walletRouter } from "./routes/wallet.routes.js";
import { quotesRouter, publicQuotesRouter } from "./routes/quotes.routes.js";
import { addressRouter, senderAddressRouter } from "./routes/address.routes.js";
import { companiesRouter } from "./routes/companies.routes.js";
import { shippingRouter } from "./routes/shipping.routes.js";
import notificationRouter from "./routes/notifications.routes.js";
import { requireAuth } from "./middlewares/auth.middleware.js";

const app = express();
const port = Number(process.env.PORT || 8787);

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

// Middleware
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: "1mb" }));

// Register Routers
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/platform", platformRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/quotes", quotesRouter);
app.use("/api/public/quotes", publicQuotesRouter);
app.use("/api/address-book", addressRouter);
app.use("/api/sender-address-book", senderAddressRouter);
app.use("/api/companies", companiesRouter);
app.use("/api", shippingRouter);
app.use("/api/notifications", notificationRouter);

import { ratesRouter } from "./routes/rates.routes.js";
app.use("/api/rates", ratesRouter);

// Global Error Handler
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
app.use(errorHandler);

const server = app.listen(port, () => {
  console.log(`Team server running on http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  await disconnectStore();
  server.close(() => process.exit(0));
});
