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
    description: "Hizli ozet ve yonetim raporlari",
    allowedRoles: ["admin"],
  },
  {
    id: "quotes",
    label: "Teklifler",
    description: "Teklif olusturma ve musteri gorunumu",
    allowedRoles: ["admin", "staff", "operations", "sales"],
  },
  {
    id: "shipping",
    label: "Kargo",
    description: "Geliver gonderi akis ve etiketler",
    allowedRoles: ["admin", "staff", "operations", "shipping"],
  },
  {
    id: "companies",
    label: "Firmalar",
    description: "Firma ve musteri kayitlari",
    allowedRoles: ["admin", "staff", "operations", "sales", "shipping", "accounting"],
  },
  {
    id: "accounting",
    label: "Muhasebe",
    description: "Aylik ve toplam kar ozeti",
    allowedRoles: ["admin", "accounting"],
  },
  {
    id: "settings",
    label: "Ayarlar",
    description: "Firma profili ve kullanicilar",
    allowedRoles: ["admin"],
  },
  {
    id: "platform",
    label: "Site Yonetimi",
    description: "Platform firma ve sistem yonetimi",
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
      <div className="flex flex-wrap gap-2">
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
                className={`group rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-red-600/10 via-orange-500/10 to-orange-400/5 ring-1 ring-inset ring-orange-300/30 shadow-sm"
                    : "bg-white/50 ring-1 ring-inset ring-ink-200/40 hover:bg-white/80 hover:ring-ink-300/50 hover:shadow-sm"
                }`}
                onClick={() => onRouteChange(route.id)}
                type="button"
              >
                <p
                  className={`text-sm font-semibold transition-colors ${
                    active ? "text-orange-700" : "text-ink-800 group-hover:text-ink-900"
                  }`}
                >
                  {route.label}
                </p>
                <p
                  className={`mt-0.5 text-xs leading-5 transition-colors ${
                    active ? "text-orange-600/70" : "text-ink-500"
                  }`}
                >
                  {route.description}
                </p>
              </button>
            );
          })}
      </div>
    </nav>
  );
}
