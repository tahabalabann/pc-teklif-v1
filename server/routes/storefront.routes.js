import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { 
  listFeaturedSystems,
  createFeaturedSystem,
  updateFeaturedSystem,
  deleteFeaturedSystem
} from "../services/storefrontService.js";

export const storefrontRouter = Router();
export const publicStorefrontRouter = Router();

// PUBLIC: Get all featured systems
publicStorefrontRouter.get("/featured-systems", async (req, res) => {
  try {
    const systems = await listFeaturedSystems();
    return res.json({ systems });
  } catch (error) {
    console.error("Error fetching featured systems:", error);
    return res.status(500).json({ error: "Sistemler yüklenemedi." });
  }
});

// PRIVATE: Admin APIs for featured systems
storefrontRouter.use(requireAuth);

// Check if user is admin or authorized
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin" && !req.user?.isPlatformAdmin) {
    return res.status(403).json({ error: "Yetkisiz erişim. Sadece yöneticiler vitrin düzenleyebilir." });
  }
  next();
};

storefrontRouter.get("/featured-systems", requireAdmin, async (req, res) => {
  try {
    const systems = await listFeaturedSystems();
    return res.json({ systems });
  } catch (error) {
    return res.status(500).json({ error: "Sistemler yüklenemedi." });
  }
});

storefrontRouter.post("/featured-systems", requireAdmin, async (req, res) => {
  try {
    const { name, category, price, specs, badge } = req.body;
    if (!name || !price || !specs) {
      return res.status(400).json({ error: "Lütfen gerekli alanları doldurun." });
    }

    const system = await createFeaturedSystem({ name, category, price, specs, badge });
    return res.status(201).json({ system });
  } catch (error) {
    console.error("Failed to create featured system:", error);
    return res.status(500).json({ error: "Sistem eklenemedi." });
  }
});

storefrontRouter.put("/featured-systems/:id", requireAdmin, async (req, res) => {
  try {
    const system = await updateFeaturedSystem(req.params.id, req.body);
    return res.json({ system });
  } catch (error) {
    console.error("Failed to update featured system:", error);
    return res.status(500).json({ error: "Sistem güncellenemedi." });
  }
});

storefrontRouter.delete("/featured-systems/:id", requireAdmin, async (req, res) => {
  try {
    await deleteFeaturedSystem(req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete featured system:", error);
    return res.status(500).json({ error: "Sistem silinemedi." });
  }
});
