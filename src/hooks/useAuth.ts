import { useState, useEffect, useCallback } from "react";
import { authApi, sessionStorageApi } from "../utils/api";
import { useAppStore } from "../store/useAppStore";

export function useAuth() {
  const [isBooting, setIsBooting] = useState(true);
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);
  const initRealtime = useAppStore((state) => state.initRealtime);

  const handleLogin = async (email: string, password: string) => {
    const nextSession = await authApi.login(email, password);
    setSession(nextSession);
  };

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setSession(null);
      sessionStorageApi.clearToken();
    }
  }, [setSession]);

  // Booting check (Hydration)
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
  }, [setSession]);

  // Real-time connection management
  useEffect(() => {
    if (session) {
      const cleanup = initRealtime();
      return () => {
        if (typeof cleanup === "function") (cleanup as any)();
      };
    }
  }, [session, initRealtime]);

  return {
    session,
    setSession,
    isBooting,
    handleLogin,
    handleLogout
  };
}
