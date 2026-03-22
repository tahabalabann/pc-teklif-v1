import { Router } from "express";
import { authenticateUser, createSessionForUser, deleteSession } from "../store.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const authRouter = Router();

authRouter.get("/session", requireAuth, (req, res) => {
  res.json({
    token: req.sessionToken,
    user: req.user,
  });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "E-posta ve parola zorunludur." });
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: "E-posta veya parola hatalı." });
  }

  const token = await createSessionForUser(user);
  return res.json({ token, user });
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  await deleteSession(req.sessionToken);
  res.json({ ok: true });
});
