import { useEffect, useRef, useState } from "react";
import type { AppNotification, AppUser } from "../../types/quote";
import { formatDateTime } from "../../utils/date";
import { Button } from "../ui/Button";

interface HeaderProps {
  onPrint: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  currentUser: AppUser;
  onLogout: () => void;
  unreadNotificationCount: number;
  notifications: AppNotification[];
  onMarkAllNotificationsRead: () => void;
}

export function Header({
  onPrint,
  theme,
  onThemeToggle,
  currentUser,
  onLogout,
  unreadNotificationCount,
  notifications,
  onMarkAllNotificationsRead,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showNotifications) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showNotifications]);

  const latestNotifications = notifications.slice(0, 8);

  return (
    <header className="print:hidden">
      <div className="surface-card overflow-hidden px-6 py-6 dark-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative">
            <div className="pointer-events-none absolute -left-8 top-0 h-28 w-28 rounded-full bg-red-100/70 blur-2xl" />
            <p className="relative text-sm font-semibold uppercase tracking-[0.22em] text-brand-600">
              2. El Bilgisayar Teklif Sistemi
            </p>
            <h1 className="display-title relative mt-2 max-w-4xl text-[2.2rem] font-semibold leading-tight text-ink-900">
              H\u0131zl\u0131 teklif, d\u00fczenli operasyon ve g\u00fcven veren \u00e7\u0131kt\u0131
            </h1>
            <p className="relative mt-3 max-w-3xl text-sm leading-6 text-ink-600">
              Teklif, kargo, firma kay\u0131tlar\u0131 ve muhasebe ak\u0131\u015flar\u0131n\u0131 tek uygulamada
              y\u00f6netin. Veriler firma bazl\u0131 ayr\u0131l\u0131r; her firma yaln\u0131zca kendi kay\u0131tlar\u0131n\u0131
              g\u00f6r\u00fcr.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="rounded-[22px] border border-ink-200 bg-white/90 px-4 py-3 text-sm text-ink-700 ring-1 ring-inset ring-white/70 dark-chip">
              <span className="font-semibold">{currentUser.name}</span> {"\u2022"}{" "}
              {currentUser.role === "admin" ? "Admin" : "Personel"}
              <div className="mt-1 text-xs text-ink-500">{currentUser.companyName || "Firma tan\u0131ms\u0131z"}</div>
              <div className="mt-1 text-xs font-semibold text-red-600">
                Bakiye: {"\u20BA"}{Number(currentUser.balance || 0).toFixed(2)}
              </div>
            </div>

            <div className="relative" ref={notificationsRef}>
              <button
                className="rounded-[22px] border border-ink-200 bg-white/90 px-4 py-3 text-left text-sm text-ink-700 transition hover:bg-white dark-chip"
                onClick={() => setShowNotifications((prev) => !prev)}
                type="button"
              >
                <span className="font-semibold">Bildirimler</span>
                <div className="mt-1 text-xs text-ink-500">
                  {unreadNotificationCount > 0
                    ? `${unreadNotificationCount} okunmam\u0131\u015f bildirim`
                    : "Yeni bildirim yok"}
                </div>
              </button>

              {showNotifications && (
                <div className="absolute right-0 z-20 mt-3 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[28px] border border-ink-200 bg-white shadow-panel dark-panel">
                  <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Bildirimler</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {unreadNotificationCount > 0
                          ? `${unreadNotificationCount} okunmam\u0131\u015f bildirim`
                          : "T\u00fcm bildirimler okundu"}
                      </p>
                    </div>
                    <button
                      className="text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={unreadNotificationCount === 0}
                      onClick={onMarkAllNotificationsRead}
                      type="button"
                    >
                      T\u00fcm\u00fcn\u00fc okundu yap
                    </button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto px-3 py-3">
                    {latestNotifications.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
                        Hen\u00fcz bildirim yok.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {latestNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`rounded-2xl border px-4 py-3 ${
                              notification.readAt ? "border-ink-100 bg-white" : "border-red-100 bg-red-50/70"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-ink-900">{notification.title}</p>
                                <p className="mt-1 text-sm text-ink-700">{notification.message}</p>
                              </div>
                              {!notification.readAt && (
                                <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                              )}
                            </div>
                            <p className="mt-2 text-xs text-ink-500">{formatDateTime(notification.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              className="rounded-2xl border border-ink-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-white dark-chip"
              onClick={onThemeToggle}
              type="button"
            >
              {theme === "dark" ? "A\u00e7\u0131k Tema" : "Karanl\u0131k Tema"}
            </button>
            <Button variant="primary" onClick={onPrint} type="button">
              PDF / Yazd\u0131r
            </Button>
            <Button variant="ghost" onClick={onLogout} type="button">
              \u00c7\u0131k\u0131\u015f Yap
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
