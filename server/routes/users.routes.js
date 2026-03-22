import { Router } from "express";
import { listUsers, createUser, deleteUserForAdmin, toggleUserActiveForAdmin } from "../store.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware.js";

export const usersRouter = Router();

usersRouter.get("/", requireAuth, requireAdmin, async (req, res) => {
  res.json({ users: await listUsers(req.user) });
});

usersRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role } = req.body ?? {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Ad, e-posta ve parola zorunludur." });
    }

    const user = await createUser({
      name,
      email,
      password,
      role,
      companyId: req.user.companyId,
      actorUser: req.user,
    });

    return res.status(201).json({ user });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Kullanıcı oluşturulamadı.",
    });
  }
});

usersRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await deleteUserForAdmin(req.user, req.params.id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Kullanıcı silinemedi.",
    });
  }
});

usersRouter.put("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await toggleUserActiveForAdmin(req.user, req.params.id, Boolean(req.body?.isActive));
    return res.json({ user });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Kullanıcı durumu güncellenemedi.",
    });
  }
});
