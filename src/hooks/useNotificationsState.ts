import { useEffect, useState } from "react";
import type { AppNotification, AppUser } from "../types/quote";
import { notificationsApi } from "../utils/api";

export function useNotificationsState(sessionUser: AppUser | null, routeKey: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!sessionUser) {
      setNotifications([]);
      return;
    }

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const items = await notificationsApi.list();
        if (!cancelled) {
          setNotifications(items);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
        }
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(() => void loadNotifications(), 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [routeKey, sessionUser]);

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        readAt: notification.readAt || new Date().toISOString(),
      })),
    );
  };

  return {
    notifications,
    setNotifications,
    markAllRead,
  };
}
