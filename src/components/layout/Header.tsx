import type { AppUser } from "../../types/quote";
import { Button } from "../ui/Button";

interface HeaderProps {
  onPrint: () => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  currentUser: AppUser;
  onLogout: () => void;
  unreadNotificationCount: number;
}

export function Header({
  onPrint,
  theme,
  onThemeToggle,
  currentUser,
  onLogout,
  unreadNotificationCount,
}: HeaderProps) {
  return (
    <header className="print:hidden">
      <div className="rounded-[28px] border border-brand-100 bg-gradient-to-r from-white via-brand-50 to-white px-6 py-5 shadow-soft dark-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-600">
              2. El Bilgisayar Teklif Sistemi
            </p>
            <h1 className="mt-1 text-3xl font-bold text-ink-900">
              Hızlı teklif, düzenli operasyon ve güven veren çıktı
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-ink-600">
              Teklif, kargo, firma kayıtları ve muhasebe akışlarını tek uygulamada yönetin. Veriler firma bazlı ayrılır;
              her firma yalnızca kendi kayıtlarını görür.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="rounded-2xl bg-white px-4 py-2 text-sm text-ink-700 ring-1 ring-inset ring-ink-200 dark-chip">
              <span className="font-semibold">{currentUser.name}</span> •{" "}
              {currentUser.role === "admin" ? "Admin" : "Personel"}
              <div className="mt-1 text-xs text-ink-500">{currentUser.companyName || "Firma tanımsız"}</div>
              <div className="mt-1 text-xs font-semibold text-red-600">Bakiye: ₺{Number(currentUser.balance || 0).toFixed(2)}</div>
            </div>

            <div className="rounded-2xl bg-white px-4 py-2 text-sm text-ink-700 ring-1 ring-inset ring-ink-200 dark-chip">
              <span className="font-semibold">Bildirimler</span>
              <div className="mt-1 text-xs text-ink-500">
                {unreadNotificationCount > 0 ? `${unreadNotificationCount} okunmamış bildirim` : "Yeni bildirim yok"}
              </div>
            </div>

            <button
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 transition hover:bg-brand-50 dark-chip"
              onClick={onThemeToggle}
              type="button"
            >
              {theme === "dark" ? "Açık Tema" : "Karanlık Tema"}
            </button>
            <Button variant="primary" onClick={onPrint} type="button">
              PDF / Yazdır
            </Button>
            <Button variant="ghost" onClick={onLogout} type="button">
              Çıkış Yap
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
