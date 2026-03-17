import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppUser, OrganizationSummary } from "../../types/quote";
import { organizationsApi } from "../../utils/api";
import { formatDateTime } from "../../utils/date";
import { formatCurrency } from "../../utils/money";
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

const emptyEditForm = {
  companyName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export function PlatformAdminPage({ currentUser }: PlatformAdminPageProps) {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationUsers, setOrganizationUsers] = useState<AppUser[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [organizationForm, setOrganizationForm] = useState(emptyOrganizationForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortMode, setSortMode] = useState<"name" | "users" | "date">("date");
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredOrganizations = useMemo(() => {
    return organizations
      .filter((organization) => {
        const matchesSearch =
          !searchTerm ||
          [organization.companyName, organization.email, organization.phone, organization.notes]
            .join(" ")
            .toLocaleLowerCase("tr")
            .includes(searchTerm.toLocaleLowerCase("tr"));
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && organization.isActive !== false) ||
          (statusFilter === "inactive" && organization.isActive === false);
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        if (sortMode === "name") {
          return left.companyName.localeCompare(right.companyName, "tr");
        }
        if (sortMode === "users") {
          return right.userCount - left.userCount;
        }
        return right.createdAt.localeCompare(left.createdAt);
      });
  }, [organizations, searchTerm, sortMode, statusFilter]);

  const selectedOrganization = useMemo(
    () => organizations.find((item) => item.id === selectedOrganizationId) || null,
    [organizations, selectedOrganizationId],
  );

  useEffect(() => {
    let mounted = true;

    const loadOrganizations = async () => {
      setLoading(true);
      setError("");

      try {
        const items = await organizationsApi.list();
        if (!mounted) {
          return;
        }

        setOrganizations(items);
        if (items[0]) {
          setSelectedOrganizationId((current) => current || items[0].id);
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

  useEffect(() => {
    if (!selectedOrganization) {
      setEditForm(emptyEditForm);
      setOrganizationUsers([]);
      return;
    }

    setEditForm({
      companyName: selectedOrganization.companyName || "",
      phone: selectedOrganization.phone || "",
      email: selectedOrganization.email || "",
      address: selectedOrganization.address || "",
      notes: selectedOrganization.notes || "",
    });

    let mounted = true;
    setUsersLoading(true);

    void organizationsApi
      .listUsers(selectedOrganization.id)
      .then((users) => {
        if (mounted) {
          setOrganizationUsers(users);
        }
      })
      .catch((caughtError) => {
        if (mounted) {
          setError(caughtError instanceof Error ? caughtError.message : "Firma kullanıcıları alınamadı.");
        }
      })
      .finally(() => {
        if (mounted) {
          setUsersLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedOrganization]);

  const handleCreateOrganization = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const organization = await organizationsApi.create(organizationForm);
      setOrganizations((prev) => [organization, ...prev]);
      setSelectedOrganizationId(organization.id);
      setOrganizationForm(emptyOrganizationForm);
      setMessage("Yeni firma ve ilk admin hesabı oluşturuldu.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Firma oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOrganization = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrganization) {
      return;
    }

    setUpdating(true);
    setMessage("");
    setError("");

    try {
      const updated = await organizationsApi.update(selectedOrganization.id, editForm);
      setOrganizations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage("Firma bilgileri güncellendi.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Firma güncellenemedi.");
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleOrganization = async (organization: OrganizationSummary, nextState: boolean) => {
    setMessage("");
    setError("");

    try {
      const updated = await organizationsApi.toggleActive(organization.id, nextState);
      setOrganizations((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`${organization.companyName} firması ${nextState ? "aktifleştirildi" : "pasife alındı"}.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Firma durumu güncellenemedi.");
    }
  };

  const handleDeleteOrganization = async () => {
    if (!selectedOrganization) {
      return;
    }

    const confirmed = window.confirm(
      `${selectedOrganization.companyName} firmasını pasife almak istediğine emin misin? Firma verileri korunur ancak kullanım kapanır.`,
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await organizationsApi.delete(selectedOrganization.id);
      setOrganizations((prev) =>
        prev.map((item) => (item.id === selectedOrganization.id ? { ...item, isActive: false } : item)),
      );
      setMessage("Firma pasife alındı.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Firma pasife alınamadı.");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.88fr)_minmax(0,1.12fr)]">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Site Yönetimi</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-900">Yeni firma aç</h2>
            <p className="mt-2 text-sm text-ink-600">
              Sisteme yeni firma ekleyin, ilk admin hesabını oluşturun ve firmaları merkezi olarak yönetin.
            </p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">{currentUser.name}</p>
            <p>{currentUser.email}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Platform Admin</p>
          </div>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleCreateOrganization}>
          <Field label="Firma adı">
            <input
              className="field"
              placeholder="Örn. Delta Teknoloji"
              value={organizationForm.companyName}
              onChange={(event) => setOrganizationForm((prev) => ({ ...prev, companyName: event.target.value }))}
            />
          </Field>
          <Field label="İlk admin adı">
            <input
              className="field"
              placeholder="Örn. Ayşe Demir"
              value={organizationForm.adminName}
              onChange={(event) => setOrganizationForm((prev) => ({ ...prev, adminName: event.target.value }))}
            />
          </Field>
          <Field label="İlk admin e-posta">
            <input
              className="field"
              placeholder="admin@firma.com"
              type="email"
              value={organizationForm.adminEmail}
              onChange={(event) => setOrganizationForm((prev) => ({ ...prev, adminEmail: event.target.value }))}
            />
          </Field>
          <Field label="İlk admin parola">
            <input
              className="field"
              placeholder="İlk girişte kullanılacak parola"
              type="password"
              value={organizationForm.adminPassword}
              onChange={(event) => setOrganizationForm((prev) => ({ ...prev, adminPassword: event.target.value }))}
            />
          </Field>

          <div className="rounded-2xl border border-ink-200 bg-ink-50/80 px-4 py-3 text-sm text-ink-600">
            Oluşturulan her firma kendi kullanıcı, teklif, kargo ve bakiye verisini ayrı tenant yapısıyla taşır.
          </div>

          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {message && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

          <Button disabled={saving} type="submit" variant="primary">
            {saving ? "Firma oluşturuluyor..." : "Firma ve İlk Admini Oluştur"}
          </Button>
        </form>
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Toplu Firma Yönetimi</p>
              <h2 className="mt-2 text-xl font-semibold text-ink-900">Firma listesi</h2>
              <p className="mt-2 text-sm text-ink-600">
                Firma ara, duruma göre filtrele ve kullanıcı sayısına göre sırala.
              </p>
            </div>
            <span className="rounded-xl bg-ink-100 px-3 py-2 text-xs font-medium text-ink-700">
              {filteredOrganizations.length} kayıt
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_180px]">
            <input
              className="field"
              placeholder="Firma, telefon, e-posta veya not ara"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}>
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
            <select className="field" value={sortMode} onChange={(event) => setSortMode(event.target.value as "name" | "users" | "date")}>
              <option value="date">Tarihe Göre</option>
              <option value="users">Kullanıcı Sayısına Göre</option>
              <option value="name">Ada Göre</option>
            </select>
          </div>

          <div className="mt-5 grid gap-3">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500">
                Firmalar yükleniyor...
              </div>
            ) : filteredOrganizations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500">
                Filtreye uygun firma yok.
              </div>
            ) : (
              filteredOrganizations.map((organization) => {
                const active = selectedOrganizationId === organization.id;
                return (
                  <button
                    key={organization.id}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-red-200 bg-red-50"
                        : "border-ink-200 bg-ink-50/80 hover:border-red-200 hover:bg-red-50/60"
                    }`}
                    onClick={() => setSelectedOrganizationId(organization.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-ink-900">{organization.companyName}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          organization.isActive !== false ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {organization.isActive !== false ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-600">
                      Kullanıcı: {organization.userCount} • Admin: {organization.adminCount}
                    </p>
                    {!!organization.notes && <p className="mt-2 text-xs text-ink-500">{organization.notes}</p>}
                    <p className="mt-2 text-xs text-ink-500">Oluşturulma: {formatDateTime(organization.createdAt)}</p>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Firma Detayı</p>
              <h2 className="mt-2 text-xl font-semibold text-ink-900">
                {selectedOrganization ? selectedOrganization.companyName : "Firma seçin"}
              </h2>
            </div>
            {selectedOrganization && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={selectedOrganization.isActive !== false ? "ghost" : "primary"}
                  onClick={() => void handleToggleOrganization(selectedOrganization, selectedOrganization.isActive === false)}
                >
                  {selectedOrganization.isActive !== false ? "Pasife Al" : "Aktifleştir"}
                </Button>
                <Button type="button" variant="danger" onClick={() => void handleDeleteOrganization()}>
                  Yumuşak Sil
                </Button>
              </div>
            )}
          </div>

          {!selectedOrganization ? (
            <div className="mt-6 rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500">
              Düzenlemek veya kullanıcılarını görmek için listeden bir firma seçin.
            </div>
          ) : (
            <>
              <form className="mt-6 grid gap-4" onSubmit={handleUpdateOrganization}>
                <Field label="Firma adı">
                  <input
                    className="field"
                    value={editForm.companyName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, companyName: event.target.value }))}
                  />
                </Field>
                <Field label="Telefon">
                  <input
                    className="field"
                    value={editForm.phone}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </Field>
                <Field label="E-posta">
                  <input
                    className="field"
                    type="email"
                    value={editForm.email}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </Field>
                <Field label="Adres">
                  <textarea
                    className="field min-h-[96px]"
                    value={editForm.address}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, address: event.target.value }))}
                  />
                </Field>
                <Field label="Firma detay notu">
                  <textarea
                    className="field min-h-[96px]"
                    value={editForm.notes}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
                  />
                </Field>
                <Button disabled={updating} type="submit" variant="secondary">
                  {updating ? "Firma güncelleniyor..." : "Firma Bilgilerini Güncelle"}
                </Button>
              </form>

              <div className="mt-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Firma Kullanıcıları</p>
                    <h3 className="mt-2 text-lg font-semibold text-ink-900">Toplu kullanıcı görünümü</h3>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {usersLoading ? (
                    <div className="rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500">
                      Kullanıcılar yükleniyor...
                    </div>
                  ) : organizationUsers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500">
                      Bu firmaya bağlı kullanıcı yok.
                    </div>
                  ) : (
                    organizationUsers.map((user) => (
                      <div key={user.id} className="rounded-2xl border border-ink-200 bg-ink-50/80 px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-ink-900">{user.name}</p>
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                  user.isActive !== false ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {user.isActive !== false ? "Aktif" : "Pasif"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-ink-600">{user.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-ink-900">
                              {user.role === "admin" ? "Firma Admini" : user.role}
                            </p>
                            <p className="mt-1 text-sm text-red-600">{formatCurrency(user.balance || 0)}</p>
                            <p className="mt-1 text-xs text-ink-500">{formatDateTime(user.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-ink-700">{label}</span>
      {children}
    </label>
  );
}
