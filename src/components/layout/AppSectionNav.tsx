import type { AppRoute } from "../../hooks/useHashRoute";

interface AppSectionNavProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
  isAdmin: boolean;
  isPlatformAdmin?: boolean;
}

const routes: Array<{
  id: AppRoute;
  label: string;
  description: string;
  adminOnly?: boolean;
  platformOnly?: boolean;
}> = [
  {
    id: "quotes",
    label: "Teklifler",
    description: "Teklif oluşturma ve müşteri görünümü",
  },
  {
    id: "shipping",
    label: "Kargo",
    description: "Geliver gönderi akışı ve etiketler",
  },
  {
    id: "companies",
    label: "Firmalar",
    description: "Firma ve müşteri kayıtları",
  },
  {
    id: "accounting",
    label: "Muhasebe",
    description: "Aylık ve toplam kar özeti",
    adminOnly: true,
  },
  {
    id: "settings",
    label: "Ayarlar",
    description: "Firma profili ve firma içi kullanıcılar",
    adminOnly: true,
  },
  {
    id: "platform",
    label: "Site Yönetimi",
    description: "Yeni firma açma ve platform yönetimi",
    adminOnly: true,
    platformOnly: true,
  },
];

export function AppSectionNav({
  currentRoute,
  onRouteChange,
  isAdmin,
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

            return !route.adminOnly || isAdmin;
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
