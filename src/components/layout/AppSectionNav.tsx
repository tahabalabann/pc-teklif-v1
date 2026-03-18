import type { AppUser } from "../../types/quote";
import type { AppRoute } from "../../hooks/useHashRoute";

interface AppSectionNavProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  currentUserRole: AppUser["role"];
  isPlatformAdmin?: boolean;
}

const routes: Array<{
  id: AppRoute;
  label: string;
  description: string;
  allowedRoles: AppUser["role"][];
  platformOnly?: boolean;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "H\u0131zl\u0131 \u00f6zet ve y\u00f6netim raporlar\u0131",
    allowedRoles: ["admin"],
  },
  {
    id: "quotes",
    label: "Teklifler",
    description: "Teklif olu\u015fturma ve m\u00fc\u015fteri g\u00f6r\u00fcn\u00fcm\u00fc",
    allowedRoles: ["admin", "staff", "operations", "sales"],
  },
  {
    id: "shipping",
    label: "Kargo",
    description: "Geliver g\u00f6nderi ak\u0131\u015f\u0131 ve etiketler",
    allowedRoles: ["admin", "staff", "operations", "shipping"],
  },
  {
    id: "companies",
    label: "Firmalar",
    description: "Firma ve m\u00fc\u015fteri kay\u0131tlar\u0131",
    allowedRoles: ["admin", "staff", "operations", "sales", "shipping", "accounting"],
  },
  {
    id: "accounting",
    label: "Muhasebe",
    description: "Ayl\u0131k ve toplam k\u00e2r \u00f6zeti",
    allowedRoles: ["admin", "accounting"],
  },
  {
    id: "settings",
    label: "Ayarlar",
    description: "Firma profili ve firma i\u00e7i kullan\u0131c\u0131lar",
    allowedRoles: ["admin"],
  },
  {
    id: "platform",
    label: "Site Y\u00f6netimi",
    description: "Yeni firma a\u00e7ma ve platform y\u00f6netimi",
    allowedRoles: ["admin"],
    platformOnly: true,
  },
];

export function AppSectionNav({
  currentRoute,
  onRouteChange,
  currentUserRole,
  isPlatformAdmin = false,
}: AppSectionNavProps) {
  return (
    <nav className="print:hidden">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {routes
          .filter((route) => {
            if (route.platformOnly) {
              return isPlatformAdmin;
            }

            return route.allowedRoles.includes(currentUserRole);
          })
          .map((route) => {
            const active = currentRoute === route.id;

            return (
              <button
                key={route.id}
                className={`rounded-[24px] border px-4 py-4 text-left transition ${
                  active
                    ? "translate-y-[-1px] border-red-200 bg-[linear-gradient(180deg,rgba(254,242,242,0.96),rgba(255,255,255,0.96))] shadow-panel"
                    : "border-white/70 bg-white/85 hover:border-red-200 hover:bg-white"
                }`}
                onClick={() => onRouteChange(route.id)}
                type="button"
              >
                <p className="display-title text-base font-semibold text-ink-900">{route.label}</p>
                <p className="mt-1 text-xs leading-5 text-ink-600">{route.description}</p>
              </button>
            );
          })}
      </div>
    </nav>
  );
}
