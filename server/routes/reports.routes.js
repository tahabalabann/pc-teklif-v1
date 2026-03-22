import { Router } from "express";
import {
  getDashboardSummaryForUser,
  listUsersForDashboard,
  getCompanyReportsForUser,
  listAuditLogsForUser,
  listWalletLedgerForUser,
  createManualWalletAdjustment
} from "../store.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware.js";

export const reportsRouter = Router();

reportsRouter.get("/dashboard", requireAuth, requireAdmin, async (req, res) => {
  try {
    const summary = await getDashboardSummaryForUser(req.user);
    return res.json({ summary });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Dashboard özeti alınamadı.",
    });
  }
});

reportsRouter.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await listUsersForDashboard(req.user);
    return res.json({ users });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Dashboard kullanıcıları alınamadı.",
    });
  }
});

reportsRouter.get("/companies", requireAuth, requireAdmin, async (req, res) => {
  try {
    const reports = await getCompanyReportsForUser(req.user);
    return res.json({ reports });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma raporları alınamadı.",
    });
  }
});

reportsRouter.get("/audit-logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const logs = await listAuditLogsForUser(req.user);
    return res.json({ logs });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Hareket geçmişi alınamadı.",
    });
  }
});

reportsRouter.get("/wallet-ledger", requireAuth, requireAdmin, async (req, res) => {
  try {
    const entries = await listWalletLedgerForUser(req.user);
    return res.json({ entries });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye hareketleri alınamadı.",
    });
  }
});

reportsRouter.post("/wallet-ledger/manual-adjustment", requireAuth, requireAdmin, async (req, res) => {
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
