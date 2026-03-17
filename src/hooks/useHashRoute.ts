import { useEffect, useState } from "react";

export type AppRoute =
  | "quotes"
  | "quote-detail"
  | "shipping"
  | "companies"
  | "accounting"
  | "settings"
  | "platform";

const validRoutes: AppRoute[] = [
  "quotes",
  "quote-detail",
  "shipping",
  "companies",
  "accounting",
  "settings",
  "platform",
];

function normalizeRoute(hash: string): AppRoute {
  const value = hash.replace(/^#/, "") as AppRoute;
  return validRoutes.includes(value) ? value : "quotes";
}

export function useHashRoute(defaultRoute: AppRoute = "quotes") {
  const [route, setRouteState] = useState<AppRoute>(() =>
    typeof window === "undefined" ? defaultRoute : normalizeRoute(window.location.hash || `#${defaultRoute}`),
  );

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = defaultRoute;
    }

    const onHashChange = () => {
      setRouteState(normalizeRoute(window.location.hash));
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [defaultRoute]);

  const setRoute = (nextRoute: AppRoute) => {
    window.location.hash = nextRoute;
    setRouteState(nextRoute);
  };

  return { route, setRoute };
}
