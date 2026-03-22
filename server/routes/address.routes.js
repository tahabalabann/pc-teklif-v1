import { Router } from "express";
import {
  listAddressBookForUser,
  saveAddressBookEntryForUser,
  deleteAddressBookEntryForUser,
  listSenderAddressBookForUser,
  saveSenderAddressBookEntryForUser,
  deleteSenderAddressBookEntryForUser
} from "../store.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const addressRouter = Router();

addressRouter.get("/", requireAuth, async (req, res) => {
  res.json({ addresses: await listAddressBookForUser(req.user) });
});

addressRouter.post("/", requireAuth, async (req, res) => {
  const label = String(req.body?.label || "").trim();
  const recipient = req.body?.recipient;

  if (!label || !recipient) {
    return res.status(400).json({ error: "Adres etiketi ve adres bilgisi zorunludur." });
  }

  try {
    const address = await saveAddressBookEntryForUser(req.user, { label, recipient });
    return res.status(201).json({ address });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Adres kaydedilemedi.",
    });
  }
});

addressRouter.delete("/:id", requireAuth, async (req, res) => {
  await deleteAddressBookEntryForUser(req.user, req.params.id);
  return res.json({ ok: true });
});

export const senderAddressRouter = Router();

senderAddressRouter.get("/", requireAuth, async (req, res) => {
  res.json({ addresses: await listSenderAddressBookForUser(req.user) });
});

senderAddressRouter.post("/", requireAuth, async (req, res) => {
  const label = String(req.body?.label || "").trim();
  const recipient = req.body?.recipient;

  if (!label || !recipient) {
    return res.status(400).json({ error: "Gönderici etiketi ve adres bilgisi zorunludur." });
  }

  try {
    const address = await saveSenderAddressBookEntryForUser(req.user, { label, recipient });
    return res.status(201).json({ address });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Gönderici adresi kaydedilemedi.",
    });
  }
});

senderAddressRouter.delete("/:id", requireAuth, async (req, res) => {
  await deleteSenderAddressBookEntryForUser(req.user, req.params.id);
  return res.json({ ok: true });
});
