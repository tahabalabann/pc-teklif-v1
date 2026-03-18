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
      <div className="flex flex-wrap gap-2 border-b border-ink-200 pb-3">
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
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  active ? "border-red-200 bg-red-50 text-red-800" : "border-ink-200 bg-white hover:border-red-200 hover:bg-red-50"
                }`}
                onClick={() => onRouteChange(route.id)}
                type="button"
              >
                <p className="text-sm font-semibold text-ink-900">{route.label}</p>
                <p className="mt-1 text-xs leading-5 text-ink-600">{route.description}</p>
              </button>
            );
          })}
      </div>
    </nav>
  );
}
