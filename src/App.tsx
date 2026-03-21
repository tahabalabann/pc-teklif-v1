import { useEffect, useMemo, useRef, useState } from "react";
import { LoginScreen } from "./components/auth/LoginScreen";
import { AppSectionNav } from "./components/layout/AppSectionNav";
import { Header } from "./components/layout/Header";
import { AccountingPage } from "./components/pages/AccountingPage";
import { CompaniesPage } from "./components/pages/CompaniesPage";
import { DashboardPage } from "./components/pages/DashboardPage";
import { PlatformAdminPage } from "./components/pages/PlatformAdminPage";
import { QuoteListPage } from "./components/pages/QuoteListPage";
import { QuoteWorkspacePage } from "./components/pages/QuoteWorkspacePage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { ShippingPage } from "./components/pages/ShippingPage";
import { PrintQuoteDocument } from "./components/quote/PrintQuoteDocument";
import { defaultTemplates } from "./data/templates";
import { useHashRoute } from "./hooks/useHashRoute";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useNotificationsState } from "./hooks/useNotificationsState";
import type {
  AppUser,
  AuthSession,
  CompanyRecord,
  CompanySettings,
  PrintTemplateMode,
  Quote,
} from "./types/quote";
import { authApi, quotesApi, sessionStorageApi, settingsApi } from "./utils/api";
import { formatDateTime } from "./utils/date";
import { cloneQuote, createEmptyQuote, sanitizeQuote, touchQuote } from "./utils/quote";
import { canAccessRoute } from "./utils/routeAccess";
import { applyCompanyDefaults, createDefaultQuote, draftKey, loadDraftForUser } from "./utils/quoteWorkspace";

function App() {
  const { route, setRoute } = useHashRoute("dashboard");
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("pc-teklif:theme", "light");
  const [showItemPricesInPrint, setShowItemPricesInPrint] = useLocalStorage<boolean>(
    "pc-teklif:showItemPricesInPrint",
    true,
  );
  const [printTemplate, setPrintTemplate] = useLocalStorage<PrintTemplateMode>(
    "pc-teklif:printTemplate",
    "standard",
  );
  const [session, setSession] = useState<AuthSession | null>(null);
  const [savedQuotes, setSavedQuotes] = useState<Quote[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [currentQuote, setCurrentQuote] = useState<Quote>(createEmptyQuote());
  const [isBooting, setIsBooting] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState("");
  const [autoSaveError, setAutoSaveError] = useState("");
  const lastSavedSnapshotRef = useRef("");
  const skipAutoSaveRef = useRef(true);
  const hasHydratedQuoteRef = useRef(false);

  const activeQuote = useMemo(() => sanitizeQuote(currentQuote), [currentQuote]);
  const normalizedSavedQuotes = useMemo(() => savedQuotes.map(sanitizeQuote), [savedQuotes]);
  const { notifications, setNotifications, markAllRead } = useNotificationsState(session?.user ?? null, route);

  useEffect(() => {
    const token = sessionStorageApi.getToken();
    if (!token) {
      setIsBooting(false);
      return;
    }

    void authApi
      .getSession()
      .then((nextSession) => setSession(nextSession))
      .catch(() => sessionStorageApi.clearToken())
      .finally(() => setIsBooting(false));
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    hasHydratedQuoteRef.current = false;
    void loadQuotes(session.user);
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (!canAccessRoute(session.user, route === "platform" ? "settings" : route === "quote-detail" ? "quote-detail" : route)) {
      setRoute("quotes");
      return;
    }

    if (route === "dashboard" && !canAccessRoute(session.user, "dashboard")) {
      setRoute("quotes");
    }

    if (route === "platform" && !session.user.isPlatformAdmin) {
      setRoute(session.user.role === "admin" ? "settings" : "quotes");
    }
  }, [route, session, setRoute]);

  useEffect(() => {
    if (!session || !hasHydratedQuoteRef.current) {
      return;
    }

    window.localStorage.setItem(draftKey(session.user), JSON.stringify(activeQuote));
  }, [activeQuote, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const serializedQuote = JSON.stringify(activeQuote);

    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      lastSavedSnapshotRef.current = serializedQuote;
      return;
    }

    if (serializedQuote === lastSavedSnapshotRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setAutoSaving(true);
      setAutoSaveState("saving");
      setAutoSaveError("");

      try {
        const saved = sanitizeQuote(await quotesApi.save(touchQuote(activeQuote)));
        lastSavedSnapshotRef.current = JSON.stringify(saved);
        setLastAutoSavedAt(saved.updatedAt);
        setAutoSaveState("saved");
        setSavedQuotes((prev) => {
          const exists = prev.some((item) => item.id === saved.id);
          return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev];
        });
        setCurrentQuote((prev) => (prev.id === saved.id ? saved : prev));
      } catch (caughtError) {
        setAutoSaveState("error");
        setAutoSaveError(caughtError instanceof Error ? caughtError.message : "Teklif kaydedilemedi.");
      } finally {
        setAutoSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [activeQuote, session]);

  const loadQuotes = async (user: AppUser) => {
    setLoadingQuotes(true);
    try {
      const [quotesResult, companySettingsResult] = await Promise.allSettled([quotesApi.list(), settingsApi.getCompany()]);
      const quotes = quotesResult.status === "fulfilled" ? quotesResult.value.map(sanitizeQuote) : [];
      const nextCompanySettings = companySettingsResult.status === "fulfilled" ? companySettingsResult.value : null;

      setCompanySettings(nextCompanySettings);
      setSavedQuotes(quotes);

      const draft = loadDraftForUser(user);
      if (draft) {
        setCurrentQuote(applyCompanyDefaults(draft, user, nextCompanySettings));
        lastSavedSnapshotRef.current = JSON.stringify(draft);
      } else if (quotes[0]) {
        setCurrentQuote(applyCompanyDefaults(quotes[0], user, nextCompanySettings));
        lastSavedSnapshotRef.current = JSON.stringify(quotes[0]);
      } else {
        const emptyQuote = createDefaultQuote(user, nextCompanySettings);
        setCurrentQuote(emptyQuote);
        lastSavedSnapshotRef.current = JSON.stringify(emptyQuote);
      }
      hasHydratedQuoteRef.current = true;
    } finally {
      setLoadingQuotes(false);
    }
  };

  const patchQuote = (patch: Partial<Quote>) => {
    setCurrentQuote((prev) => touchQuote({ ...sanitizeQuote(prev), ...patch }));
  };

  const resetSaveIndicators = () => {
    setAutoSaveState("idle");
    setLastAutoSavedAt("");
    setAutoSaveError("");
  };

  const handleSaveQuote = async () => {
    const saved = sanitizeQuote(await quotesApi.save(touchQuote(activeQuote)));
    lastSavedSnapshotRef.current = JSON.stringify(saved);
    setLastAutoSavedAt(saved.updatedAt);
    setAutoSaveState("saved");
    setAutoSaveError("");
    setSavedQuotes((prev) => {
      const exists = prev.some((item) => item.id === saved.id);
      return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev];
    });
    setCurrentQuote(saved);
  };

  const handleNewQuote = () => {
    if (!session) {
      return;
    }

    skipAutoSaveRef.current = true;
    resetSaveIndicators();
    setCurrentQuote(createDefaultQuote(session.user, companySettings));
    setRoute("quote-detail");
  };

  const handleResetQuote = () => {
    if (!session) {
      return;
    }

    skipAutoSaveRef.current = true;
    resetSaveIndicators();
    setCurrentQuote((prev) => {
      const reset = createDefaultQuote(session.user, companySettings);
      return {
        ...reset,
        id: prev.id,
        quoteNo: prev.quoteNo,
      };
    });
  };

  const handleOpenQuote = (id: string) => {
    const selected = normalizedSavedQuotes.find((quote) => quote.id === id);
    if (!selected || !session) {
      return;
    }

    skipAutoSaveRef.current = true;
    setAutoSaveState("saved");
    setAutoSaveError("");
    setLastAutoSavedAt(selected.updatedAt);
    setCurrentQuote(applyCompanyDefaults(selected, session.user, companySettings));
  };

  const handleDeleteQuote = async (id: string) => {
    await quotesApi.delete(id);
    setSavedQuotes((prev) => prev.filter((quote) => quote.id !== id));

    if (activeQuote.id === id) {
      if (!session) {
        return;
      }

      skipAutoSaveRef.current = true;
      resetSaveIndicators();
      setCurrentQuote(createDefaultQuote(session.user, companySettings));
      setRoute("quotes");
    }
  };

  const handleDuplicateQuote = (id: string) => {
    const selected = normalizedSavedQuotes.find((quote) => quote.id === id);
    if (!selected) {
      return;
    }

    skipAutoSaveRef.current = true;
    resetSaveIndicators();
    setCurrentQuote(cloneQuote(selected));
    setRoute("quotes");
  };

  const handleDuplicateActive = () => {
    skipAutoSaveRef.current = true;
    resetSaveIndicators();
    setCurrentQuote(cloneQuote(activeQuote));
  };

  const handleApplyTemplate = (templateId: string) => {
    if (!session) {
      return;
    }

    const template = defaultTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const freshQuote = createDefaultQuote(session.user, companySettings);
    skipAutoSaveRef.current = true;
    resetSaveIndicators();
    setCurrentQuote(
      touchQuote({
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
      }),
    );
  };

  const handleLogin = async (email: string, password: string) => {
    const nextSession = await authApi.login(email, password);
    setSession(nextSession);
  };

  const handleApplyCompany = (company: CompanyRecord) => {
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
  };

  const handleCompanySettingsSaved = (nextCompany: CompanySettings) => {
    setCompanySettings(nextCompany);
    setSession((prev) =>
      prev
        ? {
            ...prev,
            user: {
              ...prev.user,
              companyName: nextCompany.companyName,
            },
          }
        : prev,
    );
    setCurrentQuote((prev) => {
      const nextQuote = { ...prev };
      if (!prev.companyName || prev.companyName === session?.user.companyName) {
        nextQuote.companyName = nextCompany.companyName;
      }
      if (nextCompany.logoUrl && (!prev.companyLogo || prev.companyLogo === "")) {
        nextQuote.companyLogo = nextCompany.logoUrl;
      }
      if (nextCompany.sellerInfo && (!prev.sellerInfo || prev.sellerInfo === createEmptyQuote().sellerInfo)) {
        nextQuote.sellerInfo = nextCompany.sellerInfo;
      }
      return touchQuote(nextQuote);
    });
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      setSession(null);
      setSavedQuotes([]);
      setCompanySettings(null);
      setCurrentQuote(createEmptyQuote());
      skipAutoSaveRef.current = true;
      hasHydratedQuoteRef.current = false;
      lastSavedSnapshotRef.current = "";
      resetSaveIndicators();
      setRoute("quote-detail");
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    await markAllRead();
  };

  const saveStatusText = (() => {
    if (loadingQuotes) {
      return "Teklifler yükleniyor...";
    }

    if (autoSaving || autoSaveState === "saving") {
      return "Teklif otomatik kaydediliyor...";
    }

    if (autoSaveState === "error") {
      return autoSaveError || "Otomatik kayıt başarısız oldu.";
    }

    if (autoSaveState === "saved") {
      return `Kaydedildi • ${lastAutoSavedAt ? formatDateTime(lastAutoSavedAt) : "Az önce"}`;
    }

    return "";
  })();

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
          <p className="animate-pulse text-sm font-medium text-slate-500">Sistem hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-500 ${
        theme === "dark" ? "theme-dark bg-[#020617] bg-gradient-mesh" : "bg-slate-50 bg-gradient-mesh"
      }`}
    >
      <div className="screen-only mx-auto max-w-[1700px] animate-fade-in px-4 py-6 sm:px-6 lg:px-8">
        <Header
          currentUser={session.user}
          notifications={notifications}
          onLogout={handleLogout}
          onMarkAllNotificationsRead={() => void handleMarkAllNotificationsRead()}
          onPrint={() => window.print()}
          theme={theme}
          onThemeToggle={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
          unreadNotificationCount={notifications.filter((item) => !item.readAt).length}
        />

        <div className="mt-6 space-y-6">
          <AppSectionNav
            currentRoute={route}
            currentUserRole={session.user.role}
            isPlatformAdmin={session.user.isPlatformAdmin}
            onRouteChange={setRoute}
          />

          {route === "dashboard" && canAccessRoute(session.user, "dashboard") && <DashboardPage />}

          {route === "quotes" && canAccessRoute(session.user, "quotes") && (
            <QuoteListPage
              activeQuote={activeQuote}
              onDeleteQuote={(id) => void handleDeleteQuote(id)}
              onDuplicateQuote={handleDuplicateQuote}
              onNewQuote={handleNewQuote}
              onOpenDetail={() => setRoute("quote-detail")}
              onOpenQuote={handleOpenQuote}
              savedQuotes={normalizedSavedQuotes}
            />
          )}

          {route === "quote-detail" && canAccessRoute(session.user, "quote-detail") && (
            <QuoteWorkspacePage
              activeQuote={activeQuote}
              onApplyTemplate={handleApplyTemplate}
              onBackToList={() => setRoute("quotes")}
              onDuplicateActive={handleDuplicateActive}
              onNewQuote={handleNewQuote}
              onPatchQuote={patchQuote}
              onPrintTemplateChange={setPrintTemplate}
              onResetQuote={handleResetQuote}
              onSaveQuote={() => void handleSaveQuote()}
              onShowItemPricesChange={setShowItemPricesInPrint}
              printTemplate={printTemplate}
              saveStatusText={saveStatusText}
              saveStatusTone={autoSaveState === "error" ? "error" : "normal"}
              showItemPricesInPrint={showItemPricesInPrint}
              templates={defaultTemplates}
            />
          )}

          {route === "shipping" && canAccessRoute(session.user, "shipping") && (
            <ShippingPage
              activeQuote={activeQuote}
              companySettings={companySettings}
              currentUser={session.user}
              onDeleteQuote={(id) => void handleDeleteQuote(id)}
              onDuplicateQuote={handleDuplicateQuote}
              onOpenQuote={handleOpenQuote}
              onPatchQuote={patchQuote}
              onCurrentUserBalanceChange={(balance) =>
                setSession((prev) => (prev ? { ...prev, user: { ...prev.user, balance } } : prev))
              }
              savedQuotes={normalizedSavedQuotes}
            />
          )}

          {route === "companies" && canAccessRoute(session.user, "companies") && (
            <CompaniesPage
              quote={activeQuote}
              quotes={normalizedSavedQuotes}
              onApplyCompany={handleApplyCompany}
              onOpenQuote={(id) => {
                handleOpenQuote(id);
                setRoute("quote-detail");
              }}
            />
          )}

          {route === "accounting" && canAccessRoute(session.user, "accounting") && (
            <AccountingPage
              currentQuoteId={activeQuote.id}
              onDeleteQuote={(id) => void handleDeleteQuote(id)}
              onDuplicateQuote={handleDuplicateQuote}
              onOpenQuote={handleOpenQuote}
              quotes={normalizedSavedQuotes}
            />
          )}

          {route === "settings" && canAccessRoute(session.user, "settings") && (
            <SettingsPage
              currentUser={session.user}
              onCompanySaved={handleCompanySettingsSaved}
              notifications={notifications}
              onNotificationsChange={setNotifications}
            />
          )}

          {route === "platform" && session.user.isPlatformAdmin && (
            <PlatformAdminPage currentUser={session.user} />
          )}
        </div>
      </div>

      <div className="print-only">
        <PrintQuoteDocument
          printTemplate={printTemplate}
          quote={activeQuote}
          showItemPrices={showItemPricesInPrint}
        />
      </div>
    </div>
  );
}

export default App;
