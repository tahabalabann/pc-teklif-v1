import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Components
import { LoginScreen } from "./components/auth/LoginScreen";
import { Header } from "./components/layout/Header";
import { AccountingPage } from "./components/pages/AccountingPage";
import { CompaniesPage } from "./components/pages/CompaniesPage";
import { DashboardPage } from "./components/pages/DashboardPage";
import { PlatformAdminPage } from "./components/pages/PlatformAdminPage";
import { QuoteListPage } from "./components/pages/QuoteListPage";
import { QuoteWorkspacePage } from "./components/pages/QuoteWorkspacePage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { ShippingPage } from "./components/pages/ShippingPage";
import { ProductCatalogPage } from "./components/pages/ProductCatalogPage";
import { CustomerPortalPage } from "./components/pages/CustomerPortalPage";
import { LandingPage } from "./components/pages/LandingPage";
import { PrintQuoteDocument } from "./components/quote/PrintQuoteDocument";
import { BuilderPage } from "./components/pages/BuilderPage";
import { RegisterScreen } from "./components/auth/RegisterScreen";
import { CustomerDashboard } from "./components/pages/CustomerDashboard";

// Custom Hooks
import { useAuth } from "./hooks/useAuth";
import { useCompanySettings } from "./hooks/useCompanySettings";
import { useQuoteWorkspace } from "./hooks/useQuoteWorkspace";
import { useNotificationsState } from "./hooks/useNotificationsState";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useAppStore } from "./store/useAppStore";

// Utils & Helpers
import { defaultTemplates } from "./data/templates";
import { formatDateTime } from "./utils/date";
import { canAccessRoute } from "./utils/routeAccess";
import type { AppRoute } from "./hooks/useHashRoute";
import type { PrintTemplateMode } from "./types/quote";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = (location.pathname.replace(/^\/+/g, "") || "quotes") as AppRoute;
  const setRoute = (r: AppRoute | string) => navigate(`/${r}`);

  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  // Modular Hooks
  const { session, setSession, isBooting, handleLogin, handleLogout } = useAuth();
  const { companySettings, handleCompanySettingsSaved } = useCompanySettings(session, setSession);
  const {
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
    handleApplyCompany
  } = useQuoteWorkspace(session?.user ?? null, companySettings, setRoute);

  const { notifications, setNotifications, markAllRead } = useNotificationsState(session?.user ?? null, route);

  // UI Settings
  const [showItemPricesInPrint, setShowItemPricesInPrint] = useLocalStorage<boolean>("pc-teklif:showItemPricesInPrint", true);
  const [showImagesInPrint, setShowImagesInPrint] = useLocalStorage<boolean>("pc-teklif:showImagesInPrint", true);
  const [printTemplate, setPrintTemplate] = useLocalStorage<PrintTemplateMode>("pc-teklif:printTemplate", "standard");

  const saveStatusText = useMemo(() => {
    if (loadingQuotes) return "Teklifler yükleniyor...";
    if (autoSaving || autoSaveState === "saving") return "Teklif otomatik kaydediliyor...";
    if (autoSaveState === "error") return autoSaveError || "Otomatik kayıt başarısız oldu.";
    if (autoSaveState === "saved") return `Kaydedildi • ${lastAutoSavedAt ? formatDateTime(lastAutoSavedAt) : "Az önce"}`;
    return "";
  }, [loadingQuotes, autoSaving, autoSaveState, autoSaveError, lastAutoSavedAt]);

  if (isBooting) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="h-16 w-full border-b border-ink-200/50 bg-white/80 shrink-0"></header>
        <div className="mx-auto max-w-[1700px] p-6 space-y-6">
          <div className="h-32 w-full rounded-2xl bg-ink-200/30 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 w-full rounded-xl bg-ink-200/20 animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  const isPortal = location.pathname.startsWith("/portal");
  const isLanding = location.pathname === "/";

  if (!session) {
    if (isPortal) {
      return (
        <div className={`min-h-screen transition-colors duration-500 ${theme === "dark" ? "theme-dark bg-[#020617] bg-gradient-mesh" : "bg-slate-50 bg-gradient-mesh"}`}>
          <Toaster position="bottom-right" toastOptions={{ duration: 4000, className: "backdrop-blur-xl bg-white/90 shadow-elevated border border-ink-100 dark:bg-slate-900/90 dark:border-slate-800 dark:text-white" }} />
          <Routes>
            <Route path="/portal/quote/:id" element={<CustomerPortalPage />} />
            <Route path="/builder" element={<BuilderPage />} />
            <Route path="/register" element={<RegisterScreen onRegister={setSession} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      );
    }
    
    if (isLanding) {
      return (
        <>
          <Toaster position="bottom-right" />
          <LandingPage />
        </>
      );
    }

    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${theme === "dark" ? "theme-dark bg-[#020617] bg-gradient-mesh" : "bg-slate-50 bg-gradient-mesh"}`}>
      <Toaster position="bottom-right" toastOptions={{ duration: 4000, className: "backdrop-blur-xl bg-white/90 shadow-elevated border border-ink-100 dark:bg-slate-900/90 dark:border-slate-800 dark:text-white" }} />
      <div className="screen-only">
        {!isPortal && (
          <Header
            currentRoute={route}
            onRouteChange={setRoute}
            currentUser={session.user}
            notifications={notifications}
            onLogout={handleLogout}
            onMarkAllNotificationsRead={() => void markAllRead()}
            onPrint={() => window.print()}
            theme={theme}
            onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
            unreadNotificationCount={notifications.filter((item) => !item.readAt).length}
          />
        )}

        <main className={`relative z-0 mx-auto ${isPortal || isLanding ? 'max-w-4xl py-2' : 'max-w-[1700px] px-4 py-6 sm:px-6 lg:px-8'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={isLanding ? "" : "space-y-6"}
            >
              <Routes location={location}>
                <Route path="/portal/quote/:id" element={<CustomerPortalPage />} />
                <Route path="/builder" element={<BuilderPage />} />
                <Route path="/register" element={<RegisterScreen onRegister={setSession} />} />
                <Route path="/customer" element={session.user.role === "customer" ? <CustomerDashboard /> : <Navigate to="/dashboard" replace />} />
                <Route path="/" element={<LandingPage />} />
                <Route path="/products" element={<ProductCatalogPage />} />
                <Route path="/dashboard" element={canAccessRoute(session.user, "dashboard") ? <DashboardPage /> : <Navigate to="/quotes" replace />} />
                <Route path="/quotes" element={
                  canAccessRoute(session.user, "quotes") ? (
                    <QuoteListPage
                      activeQuote={activeQuote}
                      onDeleteQuote={(id) => void handleDeleteQuote(id)}
                      onDuplicateQuote={handleDuplicateQuote}
                      onNewQuote={handleNewQuote}
                      onOpenDetail={() => setRoute("quote-detail")}
                      onOpenQuote={handleOpenQuote}
                      savedQuotes={normalizedSavedQuotes}
                    />
                  ) : <Navigate to="/" replace />
                } />
                <Route path="/quote-detail" element={
                  canAccessRoute(session.user, "quote-detail") ? (
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
                      showImagesInPrint={showImagesInPrint}
                      onShowImagesInPrintChange={setShowImagesInPrint}
                      templates={defaultTemplates}
                    />
                  ) : <Navigate to="/quotes" replace />
                } />
                <Route path="/shipping" element={
                  canAccessRoute(session.user, "shipping") ? (
                    <ShippingPage
                      activeQuote={activeQuote}
                      companySettings={companySettings}
                      currentUser={session.user}
                      onDeleteQuote={(id) => void handleDeleteQuote(id)}
                      onDuplicateQuote={handleDuplicateQuote}
                      onOpenQuote={handleOpenQuote}
                      onPatchQuote={patchQuote}
                      onCurrentUserBalanceChange={(balance) => {
                        if (session) setSession({ ...session, user: { ...session.user, balance } });
                      }}
                      savedQuotes={normalizedSavedQuotes}
                    />
                  ) : <Navigate to="/quotes" replace />
                } />
                <Route path="/companies" element={
                  canAccessRoute(session.user, "companies") ? (
                    <CompaniesPage
                      quote={activeQuote}
                      quotes={normalizedSavedQuotes}
                      onApplyCompany={handleApplyCompany}
                      onOpenQuote={(id) => {
                        handleOpenQuote(id);
                        setRoute("quote-detail");
                      }}
                    />
                  ) : <Navigate to="/quotes" replace />
                } />
                <Route path="/accounting" element={
                  canAccessRoute(session.user, "accounting") ? (
                    <AccountingPage
                      currentQuoteId={activeQuote.id}
                      onDeleteQuote={(id) => void handleDeleteQuote(id)}
                      onDuplicateQuote={handleDuplicateQuote}
                      onOpenQuote={handleOpenQuote}
                      quotes={normalizedSavedQuotes}
                    />
                  ) : <Navigate to="/quotes" replace />
                } />
                <Route path="/settings" element={
                  canAccessRoute(session.user, "settings") ? (
                    <SettingsPage
                      currentUser={session.user}
                      onCompanySaved={handleCompanySettingsSaved}
                      notifications={notifications}
                      onNotificationsChange={setNotifications}
                    />
                  ) : <Navigate to="/quotes" replace />
                } />
                <Route path="/platform" element={
                  session.user.isPlatformAdmin ? (
                    <PlatformAdminPage currentUser={session.user} />
                  ) : <Navigate to="/quotes" replace />
                } />
                <Route path="*" element={<Navigate to={session.user.role === "customer" ? "/customer" : "/quotes"} replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <div className="print-only">
        <PrintQuoteDocument
          printTemplate={printTemplate}
          quote={activeQuote}
          showItemPrices={showItemPricesInPrint}
          showImages={showImagesInPrint}
        />
      </div>
    </div>
  );
}

export default App;
