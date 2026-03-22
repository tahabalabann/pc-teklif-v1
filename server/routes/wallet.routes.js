import { Router } from "express";
import {
  getWalletSummaryForUser,
  listDepositRequestsForUser,
  createDepositRequestForUser,
  approveDepositRequestForUser,
  rejectDepositRequestForUser
} from "../store.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware.js";
import { eventBus } from "../utils/EventBus.js";

export const walletRouter = Router();

walletRouter.get("/summary", requireAuth, async (req, res) => {
  try {
    const wallet = await getWalletSummaryForUser(req.user);
    return res.json({ wallet });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye özeti alınamadı.",
    });
  }
});

walletRouter.get("/deposit-requests", requireAuth, async (req, res) => {
  try {
    const requests = await listDepositRequestsForUser(req.user);
    return res.json({ requests });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye talepleri alınamadı.",
    });
  }
});

walletRouter.post("/deposit-requests", requireAuth, async (req, res) => {
  try {
    const request = await createDepositRequestForUser(req.user, {
      amount: req.body?.amount,
      note: req.body?.note,
    });
    eventBus.broadcast("deposit_request_created", { request });
    return res.status(201).json({ request });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye talebi oluşturulamadı.",
    });
  }
});

walletRouter.post("/deposit-requests/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await approveDepositRequestForUser(req.user, req.params.id);
    eventBus.broadcast("deposit_request_approved", { userId: result.user.id, amount: result.user.balance });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye talebi onaylanamadı.",
    });
  }
});

walletRouter.post("/deposit-requests/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const request = await rejectDepositRequestForUser(req.user, req.params.id);
    return res.json({ request });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bakiye talebi reddedilemedi.",
    });
  }
});
