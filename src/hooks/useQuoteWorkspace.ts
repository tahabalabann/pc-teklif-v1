import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { quotesApi } from "../utils/api";
import { useQuoteStore } from "../store/useAppStore";
import type { 
  Quote, 
  AppUser, 
  CompanySettings, 
  CompanyRecord 
} from "../types/quote";
import { 
  sanitizeQuote, 
  touchQuote, 
  createEmptyQuote, 
  cloneQuote 
} from "../utils/quote";
import { 
  applyCompanyDefaults, 
  draftKey, 
  loadDraftForUser,
  createDefaultQuote
} from "../utils/quoteWorkspace";
import { defaultTemplates } from "../data/templates";

export function useQuoteWorkspace(
  user: AppUser | null, 
  companySettings: CompanySettings | null,
  setRoute: (route: string) => void
) {
  const savedQuotes = useQuoteStore((state) => state.savedQuotes);
  const setSavedQuotes = useQuoteStore((state) => state.setSavedQuotes);
  const addOrUpdateSavedQuote = useQuoteStore((state) => state.addOrUpdateSavedQuote);
  const removeSavedQuote = useQuoteStore((state) => state.removeSavedQuote);
  const storeActiveQuote = useQuoteStore((state) => state.activeQuote);
  const setCurrentQuote = useQuoteStore((state) => state.setActiveQuote);

  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState("");
  const [autoSaveError, setAutoSaveError] = useState("");
  
  const lastSavedSnapshotRef = useRef("");
  const skipAutoSaveRef = useRef(true);
  const hasHydratedQuoteRef = useRef(false);

  const currentQuote = storeActiveQuote || createEmptyQuote();
  const activeQuote = useMemo(() => sanitizeQuote(currentQuote), [currentQuote]);
  const normalizedSavedQuotes = useMemo(() => savedQuotes.map(sanitizeQuote), [savedQuotes]);

  const resetSaveIndicators = useCallback(() => {
    setAutoSaveState("idle");
    setLastAutoSavedAt("");
    setAutoSaveError("");
  }, []);

  const loadQuotes = useCallback(async (u: AppUser) => {
    setLoadingQuotes(true);
    try {
      const quotes = (await quotesApi.list()).map(sanitizeQuote);
      setSavedQuotes(quotes);

      const draft = loadDraftForUser(u);
      if (draft) {
        setCurrentQuote(applyCompanyDefaults(draft, u, companySettings));
        lastSavedSnapshotRef.current = JSON.stringify(draft);
      } else if (quotes[0]) {
        setCurrentQuote(applyCompanyDefaults(quotes[0], u, companySettings));
        lastSavedSnapshotRef.current = JSON.stringify(quotes[0]);
      } else {
        const emptyQuote = createDefaultQuote(u, companySettings);
        setCurrentQuote(emptyQuote);
        lastSavedSnapshotRef.current = JSON.stringify(emptyQuote);
      }
      hasHydratedQuoteRef.current = true;
    } finally {
      setLoadingQuotes(false);
    }
  }, [companySettings, setCurrentQuote, setSavedQuotes]);

  const patchQuote = useCallback((patch: Partial<Quote>) => {
    setCurrentQuote(touchQuote({ ...sanitizeQuote(currentQuote), ...patch }));
  }, [currentQuote, setCurrentQuote]);

  const handleSaveQuote = async () => {
    try {
      const saved = sanitizeQuote(await quotesApi.save(touchQuote(activeQuote)));
      lastSavedSnapshotRef.current = JSON.stringify(saved);
      setLastAutoSavedAt(saved.updatedAt);
      setAutoSaveState("saved");
      setAutoSaveError("");
      addOrUpdateSavedQuote(saved);
      setCurrentQuote(saved);
      toast.success("Teklif başariyla kaydedildi");
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : "Kaydedilemedi");
    }
  };

  const handleNewQuote = useCallback(() => {
    if (!user) return;
    skipAutoSaveRef.current = true;
    resetSaveIndicators();
    setCurrentQuote(createDefaultQuote(user, companySettings));
    setRoute("quote-detail");
    toast.success("Yeni teklif taslaği oluşturuldu");
  }, [user, companySettings, setCurrentQuote, setRoute, resetSaveIndicators]);

  const handleResetQuote = useCallback(() => {
    if (!user) return;
    skipAutoSaveRef.current = true;
    resetSaveIndicators();
    const reset = createDefaultQuote(user, companySettings);
    setCurrentQuote({
      ...reset,
      id: currentQuote.id,
      quoteNo: currentQuote.quoteNo,
    });
  }, [user, companySettings, currentQuote.id, currentQuote.quoteNo, setCurrentQuote, resetSaveIndicators]);

  const handleOpenQuote = useCallback((id: string) => {
    const selected = normalizedSavedQuotes.find((q) => q.id === id);
    if (!selected || !user) return;
    skipAutoSaveRef.current = true;
    setAutoSaveState("saved");
    setAutoSaveError("");
    setLastAutoSavedAt(selected.updatedAt);
    setCurrentQuote(applyCompanyDefaults(selected, user, companySettings));
  }, [user, companySettings, normalizedSavedQuotes, setCurrentQuote]);

  const handleDeleteQuote = async (id: string) => {
    try {
      await quotesApi.delete(id);
      removeSavedQuote(id);
      toast.success("Teklif silindi");
      if (activeQuote.id === id) {
        if (!user) return;
        skipAutoSaveRef.current = true;
        resetSaveIndicators();
        setCurrentQuote(createDefaultQuote(user, companySettings));
        setRoute("quotes");
      }
    } catch (e) {
      toast.error("Teklif silinemedi");
    }
  };

  const handleDuplicateQuote = useCallback((id: string) => {
    const selected = normalizedSavedQuotes.find((q) => q.id === id);
    if (!selected) return;
    skipAutoSaveRef.current = true;
    resetSaveIndicators();
    setCurrentQuote(cloneQuote(selected));
    setRoute("quotes");
    toast.success("Teklif kopyalandi");
  }, [normalizedSavedQuotes, setCurrentQuote, setRoute, resetSaveIndicators]);

  const handleDuplicateActive = useCallback(() => {
    skipAutoSaveRef.current = true;
    resetSaveIndicators();
    setCurrentQuote(cloneQuote(activeQuote));
    toast.success("Teklif kopyalandi");
  }, [activeQuote, setCurrentQuote, resetSaveIndicators]);

  const handleApplyTemplate = useCallback((templateId: string) => {
    if (!user) return;
    const template = defaultTemplates.find((t) => t.id === templateId);
    if (!template) return;
    const freshQuote = createDefaultQuote(user, companySettings);
    skipAutoSaveRef.current = true;
    resetSaveIndicators();
    setCurrentQuote(touchQuote({
      ...freshQuote,
      ...template.quote,
      id: freshQuote.id,
      quoteNo: freshQuote.quoteNo,
      date: freshQuote.date,
      createdAt: freshQuote.createdAt,
      updatedAt: freshQuote.updatedAt,
      companyName: freshQuote.companyName,
      companyLogo: freshQuote.companyLogo,
      sellerInfo: freshQuote.sellerInfo,
    }));
    toast.success("Sablon uygulandi");
  }, [user, companySettings, setCurrentQuote, resetSaveIndicators]);

  const handleApplyCompany = useCallback((company: CompanyRecord) => {
    patchQuote({
      customerName: company.contactName || company.companyName,
      companyName: company.companyName || activeQuote.companyName,
      sellerInfo: activeQuote.sellerInfo,
      notes: company.notes || activeQuote.notes,
      geliverRecipient: {
        ...activeQuote.geliverRecipient,
        fullName: company.contactName || company.companyName,
        phone: company.phone || activeQuote.geliverRecipient.phone,
        email: company.email || activeQuote.geliverRecipient.email,
        address1: company.address || activeQuote.geliverRecipient.address1,
      },
    });
  }, [activeQuote, patchQuote]);

  // Effects
  useEffect(() => {
    if (user) loadQuotes(user);
  }, [user, loadQuotes]);

  useEffect(() => {
    if (user && hasHydratedQuoteRef.current) {
      window.localStorage.setItem(draftKey(user), JSON.stringify(activeQuote));
    }
  }, [activeQuote, user]);

  useEffect(() => {
    if (!user) return;
    const serializedQuote = JSON.stringify(activeQuote);
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      lastSavedSnapshotRef.current = serializedQuote;
      return;
    }
    if (serializedQuote === lastSavedSnapshotRef.current) return;

    const t = setTimeout(async () => {
      setAutoSaving(true);
      setAutoSaveState("saving");
      setAutoSaveError("");
      try {
        const saved = sanitizeQuote(await quotesApi.save(touchQuote(activeQuote)));
        lastSavedSnapshotRef.current = JSON.stringify(saved);
        setLastAutoSavedAt(saved.updatedAt);
        setAutoSaveState("saved");
        addOrUpdateSavedQuote(saved);
        if (currentQuote.id === saved.id) setCurrentQuote(saved);
      } catch (err) {
        setAutoSaveState("error");
        const m = err instanceof Error ? err.message : "Sistem hatasi";
        setAutoSaveError(m);
        toast.error("Auto-save error: " + m);
      } finally {
        setAutoSaving(false);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [activeQuote, user, currentQuote.id, setCurrentQuote, addOrUpdateSavedQuote]);

  return {
    activeQuote,
    normalizedSavedQuotes,
    loadingQuotes,
    autoSaveState,
    autoSaving,
    lastAutoSavedAt,
    autoSaveError,
    patchQuote,
    handleSaveQuote,
    handleNewQuote,
    handleResetQuote,
    handleOpenQuote,
    handleDeleteQuote,
    handleDuplicateQuote,
    handleDuplicateActive,
    handleApplyTemplate,
    handleApplyCompany,
    loadQuotes
  };
}
