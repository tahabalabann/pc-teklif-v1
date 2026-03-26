import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const uploadRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(() => {});

uploadRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const { imageBase64, filename } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: "Görsel verisi eksik." });
    }

    // Extract base64 format (e.g. data:image/png;base64,.....)
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    let buffer;
    let ext = ".png"; // Default fallback extension

    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], "base64");
    } else {
      buffer = Buffer.from(imageBase64, "base64");
    }

    if (filename) {
      const parts = filename.split(".");
      if (parts.length > 1) {
        ext = `.${parts.pop()}`;
      }
    }

    // Using crypto UUID equivalent
    const uniqueId = crypto.randomUUID();
    const newFilename = `${uniqueId}${ext}`;
    const filePath = path.join(UPLOADS_DIR, newFilename);

    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/${newFilename}`;
    res.json({ url: fileUrl });
  } catch (error) {
    next(error);
  }
});
