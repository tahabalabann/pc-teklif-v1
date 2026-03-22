import { useState, useCallback } from "react";
import type { CompanySettings, AuthSession } from "../types/quote";

export function useCompanySettings(session: AuthSession | null, setSession: (session: AuthSession | null) => void) {
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const handleCompanySettingsSaved = useCallback((nextCompany: CompanySettings) => {
    setCompanySettings(nextCompany);
    if (session) {
      setSession({
        ...session,
        user: {
          ...session.user,
          companyName: nextCompany.companyName,
        },
      });
    }
  }, [session, setSession]);

  return {
    companySettings,
    setCompanySettings,
    handleCompanySettingsSaved
  };
}
