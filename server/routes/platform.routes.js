import { Router } from "express";
import {
  listOrganizationsForPlatformAdmin,
  createOrganizationWithAdmin,
  updateOrganizationAsPlatformAdmin,
  deleteOrganizationAsPlatformAdmin,
  toggleOrganizationActiveAsPlatformAdmin
} from "../services/organizationService.js";
import { listUsersForOrganizationAsPlatformAdmin } from "../services/userService.js";
import { requireAuth, requirePlatformAdmin } from "../middlewares/auth.middleware.js";

export const platformRouter = Router();

platformRouter.get("/organizations", requireAuth, requirePlatformAdmin, async (_req, res) => {
  res.json({ organizations: await listOrganizationsForPlatformAdmin() });
});

platformRouter.post("/organizations", requireAuth, requirePlatformAdmin, async (req, res) => {
  try {
    const organization = await createOrganizationWithAdmin({
      companyName: req.body?.companyName,
      adminName: req.body?.adminName,
      adminEmail: req.body?.adminEmail,
      adminPassword: req.body?.adminPassword,
    });

    return res.status(201).json({ organization });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma oluşturulamadı.",
    });
  }
});

platformRouter.get("/organizations/:id/users", requireAuth, requirePlatformAdmin, async (req, res) => {
  try {
    const users = await listUsersForOrganizationAsPlatformAdmin(req.params.id);
    return res.json({ users });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma kullanıcıları alınamadı.",
    });
  }
});

platformRouter.put("/organizations/:id", requireAuth, requirePlatformAdmin, async (req, res) => {
  try {
    const organization = await updateOrganizationAsPlatformAdmin(req.params.id, req.body || {});
    return res.json({ organization });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma güncellenemedi.",
    });
  }
});

platformRouter.delete("/organizations/:id", requireAuth, requirePlatformAdmin, async (req, res) => {
  try {
    await deleteOrganizationAsPlatformAdmin(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma silinemedi.",
    });
  }
});

platformRouter.put("/organizations/:id/status", requireAuth, requirePlatformAdmin, async (req, res) => {
  try {
    const organization = await toggleOrganizationActiveAsPlatformAdmin(
      req.params.id,
      Boolean(req.body?.isActive)
    );
    return res.json({ organization });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma durumu güncellenemedi.",
    });
  }
});
