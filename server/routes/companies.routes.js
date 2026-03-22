import { Router } from "express";
import {
  listCompaniesForUser,
  saveCompanyForUser,
  deleteCompanyForUser
} from "../store.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

export const companiesRouter = Router();

companiesRouter.get("/", requireAuth, async (req, res) => {
  res.json({ companies: await listCompaniesForUser(req.user) });
});

companiesRouter.post("/", requireAuth, async (req, res) => {
  const company = req.body?.company;
  if (!company?.companyName) {
    return res.status(400).json({ error: "Firma adı zorunludur." });
  }

  try {
    const savedCompany = await saveCompanyForUser(req.user, company);
    return res.status(201).json({ company: savedCompany });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Firma kaydı kaydedilemedi.",
    });
  }
});

companiesRouter.delete("/:id", requireAuth, async (req, res) => {
  await deleteCompanyForUser(req.user, req.params.id);
  return res.json({ ok: true });
});
