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
      <div className="rounded-[28px] border border-brand-100 bg-gradient-to-r from-white via-brand-50 to-white px-6 py-5 shadow-soft dark-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-600">
              2. El Bilgisayar Teklif Sistemi
            </p>
            <h1 className="mt-1 text-3xl font-bold text-ink-900">
              Hızlı teklif, düzenli operasyon ve güven veren çıktı
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-ink-600">
              Teklif, kargo, firma kayıtları ve muhasebe akışlarını tek uygulamada yönetin. Veriler firma bazlı
              ayrılır; her firma yalnızca kendi kayıtlarını görür.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="rounded-2xl bg-white px-4 py-2 text-sm text-ink-700 ring-1 ring-inset ring-ink-200 dark-chip">
              <span className="font-semibold">{currentUser.name}</span> •{" "}
              {currentUser.role === "admin" ? "Admin" : "Personel"}
              <div className="mt-1 text-xs text-ink-500">{currentUser.companyName || "Firma tanımsız"}</div>
              <div className="mt-1 text-xs font-semibold text-red-600">
                Bakiye: ₺{Number(currentUser.balance || 0).toFixed(2)}
              </div>
            </div>

            <div className="relative" ref={notificationsRef}>
              <button
                className="rounded-2xl bg-white px-4 py-2 text-left text-sm text-ink-700 ring-1 ring-inset ring-ink-200 transition hover:bg-brand-50 dark-chip"
                onClick={() => setShowNotifications((prev) => !prev)}
                type="button"
              >
                <span className="font-semibold">Bildirimler</span>
                <div className="mt-1 text-xs text-ink-500">
                  {unreadNotificationCount > 0 ? `${unreadNotificationCount} okunmamış bildirim` : "Yeni bildirim yok"}
                </div>
              </button>

              {showNotifications && (
                <div className="absolute right-0 z-20 mt-3 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-soft dark-panel">
                  <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Bildirimler</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {unreadNotificationCount > 0
                          ? `${unreadNotificationCount} okunmamış bildirim`
                          : "Tüm bildirimler okundu"}
                      </p>
                    </div>
                    <button
                      className="text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={unreadNotificationCount === 0}
                      onClick={onMarkAllNotificationsRead}
                      type="button"
                    >
                      Tümünü okundu yap
                    </button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto px-3 py-3">
                    {latestNotifications.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
                        Henüz bildirim yok.
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
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 transition hover:bg-brand-50 dark-chip"
              onClick={onThemeToggle}
              type="button"
            >
              {theme === "dark" ? "Açık Tema" : "Karanlık Tema"}
            </button>
            <Button variant="primary" onClick={onPrint} type="button">
              PDF / Yazdır
            </Button>
            <Button variant="ghost" onClick={onLogout} type="button">
              Çıkış Yap
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
