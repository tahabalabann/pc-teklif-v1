import express from "express";
import { eventBus } from "../utils/EventBus.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { listNotificationsForUser, markAllNotificationsReadForUser } from "../services/notificationService.js";
import { getSessionUser } from "../services/authService.js";

const router = express.Router();

// SSE stream - uses custom auth that supports query parameter token (EventSource can't send headers)
router.get("/stream", async (req, res) => {
  const header = req.headers.authorization || "";
  const headerToken = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = headerToken || req.query.token || "";
  
  if (!token) {
    return res.status(401).json({ error: "Oturum bulunamadı." });
  }

  const session = await getSessionUser(token);
  if (!session) {
    return res.status(401).json({ error: "Oturum bulunamadı." });
  }

  eventBus.addClient(req, res);
});

// List notifications for current user
router.get("/", requireAuth, async (req, res) => {
  try {
    const notifications = await listNotificationsForUser(req.user);
    return res.json({ notifications });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Bildirimler yüklenemedi.",
    });
  }
});

// Mark all notifications as read
router.post("/read-all", requireAuth, async (req, res) => {
  try {
    await markAllNotificationsReadForUser(req.user);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Bildirimler okundu olarak işaretlenemedi.",
    });
  }
});

export default router;
