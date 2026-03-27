import { Router } from "express";
import { 
  authenticateUser, 
  createSessionForUser, 
  deleteSession, 
  createUser,
  hashPassword,
  createPasswordResetToken,
  resetPasswordWithToken
} from "../store.js";
import { sendEmail, emailTemplates } from "../utils/email.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { prisma } from "../db.js";
import { Prisma } from "@prisma/client";

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

authRouter.post("/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "İsim, e-posta ve parola zorunludur." });
  }

  try {
    const user = await createUser({
      name,
      email,
      password,
      role: "customer",
      companyId: null,
    });

    const token = await createSessionForUser(user);
    
    // Welcome email
    try {
      const template = emailTemplates.welcome(user.name);
      await sendEmail({
        to: user.email,
        ...template
      });
    } catch (mailError) {
      console.error("Welcome email failed:", mailError);
    }

    res.json({ token, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  await deleteSession(req.sessionToken);
  res.json({ ok: true });
});

authRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body ?? {};
  if (!email) {
    return res.status(400).json({ error: "E-posta adresi zorunludur." });
  }

  try {
    const token = await createPasswordResetToken(email);
    if (token) {
      const userRows = await prisma.$queryRaw(
        Prisma.sql`SELECT "name", "email" FROM "User" WHERE "email" = ${email.toLowerCase()} LIMIT 1`
      );
      const user = userRows[0];
      const resetLink = `https://www.pcteklif.com.tr/reset-password?token=${token}`;
      const template = emailTemplates.passwordReset(user.name, resetLink);
      await sendEmail({
        to: email,
        ...template
      });
    }
    // Always return success even if user not found (security best practice)
    res.json({ ok: true, message: "Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama talimatları gönderilecektir." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

authRouter.post("/reset-password", async (req, res) => {
  const { token, password } = req.body ?? {};
  if (!token || !password) {
    return res.status(400).json({ error: "Token ve yeni parola zorunludur." });
  }

  try {
    const { salt, hash } = hashPassword(password);
    await resetPasswordWithToken(token, hash, salt);
    res.json({ ok: true, message: "Şifreniz başarıyla güncellendi." });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
