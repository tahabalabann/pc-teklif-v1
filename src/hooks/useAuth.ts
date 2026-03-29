import { useState, useEffect, useCallback } from "react";
import { authApi, sessionStorageApi } from "../utils/api";
import { useAppStore } from "../store/useAppStore";

export function useAuth() {
  const [isBooting, setIsBooting] = useState(true);
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);
  const initRealtime = useAppStore((state) => state.initRealtime);

  const fetchRates = useAppStore((state) => state.fetchRates);

  const handleLogin = async (email: string, password: string) => {
    const nextSession = await authApi.login(email, password);
    setSession(nextSession);
    void fetchRates();
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
      .then((nextSession) => {
        setSession(nextSession);
        void fetchRates();
      })
      .catch(() => sessionStorageApi.clearToken())
      .finally(() => setIsBooting(false));
  }, [setSession, fetchRates]);

  // Real-time connection management
  useEffect(() => {
    if (session) {
      const cleanup = initRealtime();
      return () => {
        if (cleanup) cleanup();
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
