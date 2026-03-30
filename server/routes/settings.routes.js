import { Router } from "express";
import { getOrganizationForUser, updateOrganizationForUser } from "../services/organizationService.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware.js";

export const settingsRouter = Router();

settingsRouter.get("/company", requireAuth, async (req, res) => {
  try {
    const company = await getOrganizationForUser(req.user);
    return res.json({ company });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma ayarları alınamadı.",
    });
  }
});

settingsRouter.put("/company", requireAuth, requireAdmin, async (req, res) => {
  try {
    const company = await updateOrganizationForUser(req.user, req.body?.company || {});
    return res.json({ company });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma ayarları güncellenemedi.",
    });
  }
});
