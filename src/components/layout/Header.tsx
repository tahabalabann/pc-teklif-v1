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
  const roleLabel =
    currentUser.role === "admin"
      ? "Admin"
      : currentUser.role === "accounting"
        ? "Muhasebe"
        : currentUser.role === "operations"
          ? "Operasyon"
          : currentUser.role === "shipping"
            ? "Kargo"
            : currentUser.role === "sales"
              ? "Satış"
              : "Personel";

  return (
    <header className="print:hidden">
      <div className="overflow-hidden rounded-2xl bg-gradient-header shadow-elevated">
        <div className="px-6 py-6 lg:px-8 lg:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="animate-fade-in">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400">
                PC Teklif ve Operasyon Paneli
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white lg:text-3xl">
                Teklif, kargo ve firma kayitlarini yonetin
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
                Gunluk kullanim icin hizli teklif hazirlama, kargo takibi, bakiye yonetimi ve firma bazli
                kayitlari tek panelde toplayin.
              </p>
            </div>

            <div className="flex flex-wrap items-start gap-2.5">
              {/* User chip */}
              <div className="rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold text-white shadow-md">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{currentUser.name}</div>
                    <div className="mt-0.5 text-xs text-white/50">
                      {roleLabel} • {currentUser.companyName || "Firma tanimsiz"}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs font-semibold text-orange-300">
                  Bakiye: ₺{Number(currentUser.balance || 0).toFixed(2)}
                </div>
              </div>

              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button
                  className="rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 text-left text-sm backdrop-blur-sm transition-all hover:bg-white/[0.12]"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    <span className="font-semibold text-white">Bildirimler</span>
                    {unreadNotificationCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
                        {unreadNotificationCount}
                      </span>
                    )}
                  </div>
                </button>

                {showNotifications && (
                  <div className="absolute right-0 z-20 mt-3 w-[380px] max-w-[calc(100vw-2rem)] animate-scale-in overflow-hidden rounded-2xl border border-ink-200/50 bg-white/90 shadow-elevated backdrop-blur-2xl dark-panel">
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
                        Tumunu okundu yap
                      </button>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto px-3 py-3">
                      {latestNotifications.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-500">
                          Henuz bildirim yok.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {latestNotifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`rounded-xl border px-4 py-3 transition-colors ${
                                notification.readAt
                                  ? "border-ink-100 bg-white/60"
                                  : "border-orange-200/50 bg-orange-50/60"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-ink-900">{notification.title}</p>
                                  <p className="mt-1 text-sm text-ink-700">{notification.message}</p>
                                </div>
                                {!notification.readAt && (
                                  <span className="mt-1 inline-flex h-2.5 w-2.5 animate-pulse-dot rounded-full bg-gradient-to-r from-orange-500 to-red-500" />
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

              {/* Action buttons */}
              <button
                className="rounded-xl border border-white/10 bg-white/[0.07] px-4 py-2.5 text-sm font-semibold text-white/80 backdrop-blur-sm transition-all hover:bg-white/[0.12]"
                onClick={onThemeToggle}
                type="button"
              >
                {theme === "dark" ? "☀️ Acik" : "🌙 Karanlik"}
              </button>
              <Button variant="primary" onClick={onPrint} type="button">
                PDF / Yazdir
              </Button>
              <button
                className="rounded-xl border border-white/10 bg-white/[0.07] px-4 py-2.5 text-sm font-semibold text-white/60 backdrop-blur-sm transition-all hover:bg-red-500/20 hover:text-white"
                onClick={onLogout}
                type="button"
              >
                Cikis Yap
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
