import { useEffect, useRef, useState } from "react";
import type { AppNotification, AppUser } from "../../types/quote";
import type { AppRoute } from "../../hooks/useHashRoute";
import { formatDateTime } from "../../utils/date";

interface HeaderProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  currentUser: AppUser;
  onLogout: () => void;
  onPrint: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  unreadNotificationCount: number;
  notifications: AppNotification[];
  onMarkAllNotificationsRead: () => void;
}

const routes: Array<{
  id: AppRoute;
  label: string;
  allowedRoles: AppUser["role"][];
  platformOnly?: boolean;
}> = [
  { id: "dashboard", label: "Dashboard", allowedRoles: ["admin"] },
  { id: "quotes", label: "Teklifler", allowedRoles: ["admin", "staff", "operations", "sales"] },
  { id: "shipping", label: "Kargo", allowedRoles: ["admin", "staff", "operations", "shipping"] },
  { id: "companies", label: "Adres Defteri", allowedRoles: ["admin", "staff", "operations", "sales", "shipping", "accounting"] },
  { id: "products", label: "Ürünler", allowedRoles: ["admin", "staff", "operations", "sales"] },
  { id: "accounting", label: "Muhasebe", allowedRoles: ["admin", "accounting"] },
  { id: "settings", label: "Ayarlar", allowedRoles: ["admin"] },
  { id: "platform", label: "Site Yönetimi", allowedRoles: ["admin"], platformOnly: true },
];

export function Header({
  currentRoute,
  onRouteChange,
  currentUser,
  onLogout,
  onPrint,
  theme,
  onThemeToggle,
  unreadNotificationCount,
  notifications,
  onMarkAllNotificationsRead,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showNotifications) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showNotifications]);

  const latestNotifications = notifications.slice(0, 8);
  const isPlatformAdmin = currentUser.isPlatformAdmin;

  const allowedRoutes = routes.filter((r) => {
    if (r.platformOnly) return isPlatformAdmin;
    return r.allowedRoles.includes(currentUser.role);
  });

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-[#020617]/80 border-b border-ink-200/50 print:hidden shadow-sm">
      <div className="mx-auto max-w-[1700px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-sm font-bold">
                PC
              </div>
              <span className="text-lg font-bold tracking-tight text-ink-900 hidden sm:block">Teklif</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-1">
              {allowedRoutes.map((route) => {
                const active = currentRoute === route.id;
                return (
                  <button
                    key={route.id}
                    onClick={() => onRouteChange(route.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      active
                        ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                        : "text-ink-600 hover:bg-ink-50 hover:text-ink-900 dark:hover:bg-white/5 dark:text-ink-400"
                    }`}
                  >
                    {route.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
             {/* Mobile Menu Toggle */}
             <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-ink-600 hover:text-ink-900 transition-colors rounded-lg hover:bg-ink-50 dark:hover:bg-white/5 dark:text-ink-400"
             >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
                </svg>
             </button>

             {/* Action buttons */}
             <div className="flex items-center">
               <button onClick={onThemeToggle} className="p-2 text-ink-500 hover:text-ink-900 transition-colors rounded-full hover:bg-ink-50 dark:hover:bg-white/5 dark:text-ink-400">
                  {theme === "dark" ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                  )}
               </button>

               <button onClick={onPrint} className="hidden sm:block p-2 text-ink-500 hover:text-ink-900 transition-colors rounded-full hover:bg-ink-50 dark:hover:bg-white/5 dark:text-ink-400" title="Yazdır">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
               </button>

               <div className="relative" ref={notificationsRef}>
                  <button
                    className="relative p-2 text-ink-500 hover:text-ink-900 transition-colors rounded-full hover:bg-ink-50 dark:hover:bg-white/5 dark:text-ink-400"
                    onClick={() => setShowNotifications((prev) => !prev)}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                    {unreadNotificationCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-[#020617]">
                        {unreadNotificationCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-ink-100 bg-white shadow-elevated z-50 animate-scale-in origin-top-right dark-panel overflow-hidden">
                      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-ink-900">Bildirimler</p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            {unreadNotificationCount > 0
                              ? `${unreadNotificationCount} okunmamis bildirim`
                              : "Tum bildirimler okundu"}
                          </p>
                        </div>
                        <button
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={unreadNotificationCount === 0}
                          onClick={onMarkAllNotificationsRead}
                          type="button"
                        >
                          Tümünü okundu yap
                        </button>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto p-3 space-y-2">
                        {latestNotifications.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
                            Henüz bildirim yok.
                          </div>
                        ) : (
                          latestNotifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`rounded-xl border px-4 py-3 transition-colors ${
                                notification.readAt
                                  ? "border-ink-100 bg-white/60 dark:bg-white/5"
                                  : "border-orange-200/50 bg-orange-50/60 dark:bg-orange-500/10 dark:border-orange-500/20"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-ink-900">{notification.title}</p>
                                  <p className="mt-1 text-sm text-ink-700">{notification.message}</p>
                                </div>
                                {!notification.readAt && (
                                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-orange-500" />
                                )}
                              </div>
                              <p className="mt-2 text-xs text-ink-500">{formatDateTime(notification.createdAt)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
               </div>
             </div>

             <div className="h-6 w-px bg-ink-200 mx-1 dark:bg-white/10 hidden md:block"></div>

             {/* User Info / Logout */}
             <div className="flex items-center gap-3">
               <div className="hidden lg:flex flex-col items-end">
                 <span className="text-sm font-semibold text-ink-900 leading-none">{currentUser.name}</span>
                 <span className="text-[11px] text-ink-500 mt-1 font-medium">Bakiye: ₺{Number(currentUser.balance || 0).toFixed(2)}</span>
               </div>
               <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100/80 text-orange-700 font-bold text-sm ring-1 ring-orange-200/50 shadow-sm dark:bg-orange-500/20 dark:text-orange-400 dark:ring-orange-500/30">
                 {currentUser.name.charAt(0).toUpperCase()}
               </div>
               <button onClick={onLogout} className="hidden sm:block p-2 text-ink-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-500/10" title="Çıkış Yap">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
               </button>
             </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-ink-200/50 dark:border-white/10 py-4 animate-slide-up bg-white/95 dark:bg-[#020617]/95">
            <nav className="flex flex-col space-y-1">
              {allowedRoutes.map((route) => {
                const active = currentRoute === route.id;
                return (
                  <button
                    key={route.id}
                    onClick={() => {
                        onRouteChange(route.id);
                        setIsMobileMenuOpen(false);
                    }}
                    className={`px-4 py-3 text-left rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                        : "text-ink-600 hover:bg-ink-50 hover:text-ink-900 dark:hover:bg-white/5 dark:text-ink-400"
                    }`}
                  >
                    {route.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
