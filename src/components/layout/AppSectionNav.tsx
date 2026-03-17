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
    description: "Hızlı özet ve yönetim raporları",
    allowedRoles: ["admin"],
  },
  {
    id: "quotes",
    label: "Teklifler",
    description: "Teklif oluşturma ve müşteri görünümü",
    allowedRoles: ["admin", "staff", "operations", "sales"],
  },
  {
    id: "shipping",
    label: "Kargo",
    description: "Geliver gönderi akışı ve etiketler",
    allowedRoles: ["admin", "staff", "operations", "shipping"],
  },
  {
    id: "companies",
    label: "Firmalar",
    description: "Firma ve müşteri kayıtları",
    allowedRoles: ["admin", "staff", "operations", "sales", "shipping", "accounting"],
  },
  {
    id: "accounting",
    label: "Muhasebe",
    description: "Aylık ve toplam kâr özeti",
    allowedRoles: ["admin", "accounting"],
  },
  {
    id: "settings",
    label: "Ayarlar",
    description: "Firma profili ve firma içi kullanıcılar",
    allowedRoles: ["admin"],
  },
  {
    id: "platform",
    label: "Site Yönetimi",
    description: "Yeni firma açma ve platform yönetimi",
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
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  active
                    ? "border-red-200 bg-red-50 shadow-soft"
                    : "border-white/70 bg-white/90 hover:border-red-200 hover:bg-red-50/60"
                }`}
                onClick={() => onRouteChange(route.id)}
                type="button"
              >
                <p className="text-sm font-semibold text-ink-900">{route.label}</p>
                <p className="mt-1 text-xs text-ink-600">{route.description}</p>
              </button>
            );
          })}
      </div>
    </nav>
  );
}
