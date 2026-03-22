import { Router } from "express";
import {
  listNotificationsForUser,
  markAllNotificationsReadForUser
} from "../store.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req, res) => {
  try {
    const notifications = await listNotificationsForUser(req.user);
    return res.json({ notifications });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bildirimler alınamadı.",
    });
  }
});

notificationsRouter.post("/read-all", requireAuth, async (req, res) => {
  try {
    await markAllNotificationsReadForUser(req.user);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Bildirimler güncellenemedi.",
    });
  }
});
