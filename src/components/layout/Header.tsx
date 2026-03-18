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
      <div className="surface-card px-6 py-5 dark-panel">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              PC Teklif ve Operasyon Paneli
            </p>
            <h1 className="mt-2 text-3xl font-bold text-ink-900">Teklif, kargo ve firma kayitlarini yonetin</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">
              Gunluk kullanim icin hizli teklif hazirlama, kargo takibi, bakiye yonetimi ve firma bazli
              kayitlari tek panelde toplayin.
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-3">
            <div className="rounded-lg border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-700 dark-chip">
              <div className="font-semibold">{currentUser.name}</div>
              <div className="mt-1 text-xs text-ink-500">
                {currentUser.role === "admin" ? "Admin" : "Personel"} • {currentUser.companyName || "Firma tanimsiz"}
              </div>
              <div className="mt-2 text-xs font-semibold text-red-700">
                Bakiye: ₺{Number(currentUser.balance || 0).toFixed(2)}
              </div>
            </div>

            <div className="relative" ref={notificationsRef}>
              <button
                className="rounded-lg border border-ink-300 bg-white px-4 py-3 text-left text-sm text-ink-700 transition hover:bg-ink-50 dark-chip"
                onClick={() => setShowNotifications((prev) => !prev)}
                type="button"
              >
                <span className="font-semibold">Bildirimler</span>
                <div className="mt-1 text-xs text-ink-500">
                  {unreadNotificationCount > 0 ? `${unreadNotificationCount} okunmamis bildirim` : "Yeni bildirim yok"}
                </div>
              </button>

              {showNotifications && (
                <div className="absolute right-0 z-20 mt-3 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-ink-200 bg-white shadow-panel dark-panel">
                  <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-4">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Bildirimler</p>
                      <p className="mt-1 text-xs text-ink-500">
                        {unreadNotificationCount > 0
                          ? `${unreadNotificationCount} okunmamis bildirim`
                          : "Tum bildirimler okundu"}
                      </p>
                    </div>
                    <button
                      className="text-xs font-semibold text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={unreadNotificationCount === 0}
                      onClick={onMarkAllNotificationsRead}
                      type="button"
                    >
                      Tumunu okundu yap
                    </button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto px-3 py-3">
                    {latestNotifications.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
                        Henuz bildirim yok.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {latestNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`rounded-lg border px-4 py-3 ${
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
              className="rounded-lg border border-ink-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 dark-chip"
              onClick={onThemeToggle}
              type="button"
            >
              {theme === "dark" ? "Acik Tema" : "Karanlik Tema"}
            </button>
            <Button variant="primary" onClick={onPrint} type="button">
              PDF / Yazdir
            </Button>
            <Button variant="ghost" onClick={onLogout} type="button">
              Cikis Yap
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
