import { getSessionUser } from "../store.js";

export function requireAuth(req, res, next) {
  void (async () => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
      return res.status(401).json({ error: "Oturum bulunamadı." });
    }

    const session = await getSessionUser(token);
    if (!session) {
      return res.status(401).json({ error: "Oturum bulunamadı." });
    }

    req.sessionToken = session.token;
    req.user = session.user;
    next();
  })().catch((error) => {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Oturum doğrulanamadı.",
    });
  });
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Bu işlem için admin yetkisi gerekiyor." });
  }
  next();
}

export function requirePlatformAdmin(req, res, next) {
  if (!req.user?.isPlatformAdmin) {
    return res.status(403).json({ error: "Bu işlem için platform admin yetkisi gerekiyor." });
  }
  next();
}
