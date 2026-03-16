import { useEffect, useState } from "react";
import type { AppUser, CompanySettings } from "../../types/quote";
import { settingsApi, usersApi } from "../../utils/api";
import { formatDateTime } from "../../utils/date";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface SettingsPageProps {
  currentUser: AppUser;
  onCompanySaved: (company: CompanySettings) => void;
}

const emptyCompanySettings: CompanySettings = {
  id: "",
  companyName: "",
  logoUrl: "",
  phone: "",
  email: "",
  address: "",
  sellerInfo: "",
  createdAt: "",
};

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "staff" as "admin" | "staff",
};

export function SettingsPage({ currentUser, onCompanySaved }: SettingsPageProps) {
  const [company, setCompany] = useState<CompanySettings>(emptyCompanySettings);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [loading, setLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [companyMessage, setCompanyMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const [companySettings, companyUsers] = await Promise.all([settingsApi.getCompany(), usersApi.list()]);
        if (!mounted) {
          return;
        }

        setCompany(companySettings);
        setUsers(companyUsers);
      } catch (caughtError) {
        if (!mounted) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : "Ayarlar yüklenemedi.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCompanySaving(true);
    setCompanyMessage("");
    setError("");

    try {
      const saved = await settingsApi.saveCompany(company);
      setCompany(saved);
      onCompanySaved(saved);
      setCompanyMessage("Firma ayarları kaydedildi.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Firma ayarları kaydedilemedi.");
    } finally {
      setCompanySaving(false);
    }
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserSaving(true);
    setUserMessage("");
    setError("");

    try {
      const user = await usersApi.create(userForm);
      setUsers((prev) => [...prev, user].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setUserForm(emptyUserForm);
      setUserMessage("Yeni kullanıcı eklendi.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Kullanıcı oluşturulamadı.");
    } finally {
      setUserSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-ink-600">Firma ayarları yükleniyor...</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Firma Ayarları</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-900">{company.companyName || currentUser.companyName}</h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              Firma kimliğini, tekliflerde kullanılacak temel iletişim bilgisini ve varsayılan satıcı notunu tek yerden yönetin.
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">{currentUser.name}</p>
            <p>{currentUser.companyName}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">{currentUser.role}</p>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSaveCompany}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">Firma adı</span>
            <input
              className="field"
              value={company.companyName}
              onChange={(event) => setCompany((prev) => ({ ...prev, companyName: event.target.value }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">Logo URL</span>
            <input
              className="field"
              placeholder="https://..."
              value={company.logoUrl}
              onChange={(event) => setCompany((prev) => ({ ...prev, logoUrl: event.target.value }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">Telefon</span>
            <input
              className="field"
              value={company.phone}
              onChange={(event) => setCompany((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">E-posta</span>
            <input
              className="field"
              value={company.email}
              onChange={(event) => setCompany((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-ink-700">Adres</span>
            <textarea
              className="field min-h-[96px]"
              value={company.address}
              onChange={(event) => setCompany((prev) => ({ ...prev, address: event.target.value }))}
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-ink-700">Varsayılan satıcı bilgisi</span>
            <textarea
              className="field min-h-[120px]"
              value={company.sellerInfo}
              onChange={(event) => setCompany((prev) => ({ ...prev, sellerInfo: event.target.value }))}
            />
          </label>

          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">{error}</div>}
          {companyMessage && (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 md:col-span-2">
              {companyMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <Button disabled={companySaving} type="submit" variant="primary">
              {companySaving ? "Kaydediliyor..." : "Firma Ayarlarını Kaydet"}
            </Button>
            <span className="text-xs text-ink-500">Bu bilgiler yeni tekliflerde varsayılan olarak kullanılabilir.</span>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Kullanıcı Yönetimi</p>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">Firma kullanıcıları</h2>
            <p className="mt-2 text-sm text-ink-600">
              Bu firmaya bağlı personeli ekleyin. Aynı firmadaki kullanıcılar ortak teklif havuzunu görür.
            </p>
          </div>
          <div className="rounded-xl bg-ink-100 px-3 py-2 text-xs font-medium text-ink-700">{users.length} kullanıcı</div>
        </div>

        <form className="mt-5 grid gap-3" onSubmit={handleCreateUser}>
          <input
            className="field"
            placeholder="Ad soyad"
            value={userForm.name}
            onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="field"
            placeholder="E-posta"
            type="email"
            value={userForm.email}
            onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <input
            className="field"
            placeholder="Geçici parola"
            type="password"
            value={userForm.password}
            onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <select
            className="field"
            value={userForm.role}
            onChange={(event) =>
              setUserForm((prev) => ({ ...prev, role: event.target.value === "admin" ? "admin" : "staff" }))
            }
          >
            <option value="staff">Personel</option>
            <option value="admin">Admin</option>
          </select>

          {userMessage && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{userMessage}</div>}

          <Button disabled={userSaving} type="submit" variant="secondary">
            {userSaving ? "Ekleniyor..." : "Kullanıcı Ekle"}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-2xl border border-ink-200 bg-ink-50/80 px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-ink-900">{user.name}</p>
                  <p className="mt-1 text-sm text-ink-600">{user.email}</p>
                  <p className="mt-1 text-xs text-ink-500">Eklenme: {formatDateTime(user.createdAt)}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-600 ring-1 ring-ink-200">
                  {user.role === "admin" ? "Admin" : "Personel"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
