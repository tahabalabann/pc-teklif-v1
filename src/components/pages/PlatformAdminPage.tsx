import { useEffect, useState } from "react";
import type { AppUser, OrganizationSummary } from "../../types/quote";
import { organizationsApi } from "../../utils/api";
import { formatDateTime } from "../../utils/date";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface PlatformAdminPageProps {
  currentUser: AppUser;
}

const emptyOrganizationForm = {
  companyName: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export function PlatformAdminPage({ currentUser }: PlatformAdminPageProps) {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationForm, setOrganizationForm] = useState(emptyOrganizationForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadOrganizations = async () => {
      setLoading(true);
      setError("");

      try {
        const items = await organizationsApi.list();
        if (mounted) {
          setOrganizations(items);
        }
      } catch (caughtError) {
        if (mounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Firmalar yüklenemedi.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadOrganizations();

    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateOrganization = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const organization = await organizationsApi.create(organizationForm);
      setOrganizations((prev) => [organization, ...prev]);
      setOrganizationForm(emptyOrganizationForm);
      setMessage("Yeni firma ve ilk admin hesabı oluşturuldu.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Firma oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">
              Site Yönetimi
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-900">Yeni firma aç</h2>
            <p className="mt-2 text-sm text-ink-600">
              Bu alan yalnızca site yöneticisine özeldir. Buradan sisteme yeni firma ve ilk admin
              hesabı açabilirsin.
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">{currentUser.name}</p>
            <p>{currentUser.email}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Platform Admin</p>
          </div>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleCreateOrganization}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">Firma adı</span>
            <input
              className="field"
              placeholder="Örn. Delta Teknoloji"
              value={organizationForm.companyName}
              onChange={(event) =>
                setOrganizationForm((prev) => ({ ...prev, companyName: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">İlk admin adı</span>
            <input
              className="field"
              placeholder="Örn. Ayşe Demir"
              value={organizationForm.adminName}
              onChange={(event) =>
                setOrganizationForm((prev) => ({ ...prev, adminName: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">İlk admin e-posta</span>
            <input
              className="field"
              placeholder="admin@firma.com"
              type="email"
              value={organizationForm.adminEmail}
              onChange={(event) =>
                setOrganizationForm((prev) => ({ ...prev, adminEmail: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">İlk admin parola</span>
            <input
              className="field"
              placeholder="İlk girişte kullanılacak parola"
              type="password"
              value={organizationForm.adminPassword}
              onChange={(event) =>
                setOrganizationForm((prev) => ({ ...prev, adminPassword: event.target.value }))
              }
            />
          </label>

          <div className="rounded-2xl border border-ink-200 bg-ink-50/80 px-4 py-3 text-sm text-ink-600">
            Oluşturulan firma tamamen ayrı çalışır. Kendi kullanıcıları, teklifleri, kargo kayıtları
            ve bakiyesi diğer firmalardan izole edilir.
          </div>

          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <Button disabled={saving} type="submit" variant="primary">
            {saving ? "Firma oluşturuluyor..." : "Firma ve İlk Admini Oluştur"}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">
              Firma Listesi
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">Sistemdeki firmalar</h2>
            <p className="mt-2 text-sm text-ink-600">
              Açılmış firmaları ve admin/kullanıcı sayılarını buradan takip edebilirsin.
            </p>
          </div>
          <div className="rounded-xl bg-ink-100 px-3 py-2 text-xs font-medium text-ink-700">
            {organizations.length} firma
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500">
              Firmalar yükleniyor...
            </div>
          ) : organizations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500">
              Henüz firma yok.
            </div>
          ) : (
            organizations.map((organization) => (
              <div key={organization.id} className="rounded-2xl border border-ink-200 bg-ink-50/80 px-4 py-4">
                <p className="font-semibold text-ink-900">{organization.companyName}</p>
                <p className="mt-1 text-sm text-ink-600">
                  Kullanıcı: {organization.userCount} • Admin: {organization.adminCount}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  Oluşturulma: {formatDateTime(organization.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
