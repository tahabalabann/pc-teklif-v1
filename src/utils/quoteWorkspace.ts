import type { AppUser, CompanySettings, Quote } from "../types/quote";
import { createEmptyQuote, sanitizeQuote } from "./quote";

export function draftKey(user: AppUser) {
  return `pc-teklif:draftQuote:${user.id}`;
}

export function loadDraftForUser(user: AppUser) {
  try {
    const raw = window.localStorage.getItem(draftKey(user));
    return raw ? sanitizeQuote(JSON.parse(raw) as Quote) : null;
  } catch {
    return null;
  }
}

export function createDefaultQuote(user: AppUser, companySettings: CompanySettings | null) {
  return applyCompanyDefaults(createEmptyQuote(), user, companySettings);
}

export function applyCompanyDefaults(baseQuote: Quote, user: AppUser, companySettings: CompanySettings | null) {
  return sanitizeQuote({
    ...baseQuote,
    companyName: companySettings?.companyName || user.companyName || baseQuote.companyName,
    companyLogo: companySettings?.logoUrl || baseQuote.companyLogo,
    sellerInfo: companySettings?.sellerInfo || baseQuote.sellerInfo,
  });
}
