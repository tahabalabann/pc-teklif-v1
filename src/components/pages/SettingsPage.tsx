import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppNotification, AppUser, CompanySettings, DepositRequest } from "../../types/quote";
import { notificationsApi, reportsApi, settingsApi, usersApi, walletApi } from "../../utils/api";
import { formatDateTime } from "../../utils/date";
import { formatCurrency } from "../../utils/money";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface SettingsPageProps {
  currentUser: AppUser;
  onCompanySaved: (company: CompanySettings) => void;
  notifications: AppNotification[];
  onNotificationsChange: (notifications: AppNotification[]) => void;
}

const emptyCompanySettings: CompanySettings = {
  id: "",
  companyName: "",
  logoUrl: "",
  phone: "",
  email: "",
  address: "",
  sellerInfo: "",
  paymentAccountName: "",
  paymentIban: "",
  notes: "",
  createdAt: "",
};

const emptyUserForm: {
  name: string;
  email: string;
  password: string;
  role: AppUser["role"];
} = {
  name: "",
  email: "",
  password: "",
  role: "staff",
};

const roleOptions: Array<{ value: AppUser["role"]; label: string; description: string }> = [
  { value: "admin", label: "Firma Admini", description: "Firma içi tüm yönetim alanlarına erişir." },
  { value: "accounting", label: "Muhasebe", description: "Bakiye ve finans ağırlıklı çalışır." },
  { value: "operations", label: "Operasyon", description: "Genel akış ve süreç yönetimi yapar." },
  { value: "shipping", label: "Kargo Personeli", description: "Kargo operasyonlarına odaklanır." },
  { value: "sales", label: "Teklif Personeli", description: "Teklif ve müşteri tarafında çalışır." },
  { value: "staff", label: "Genel Personel", description: "Temel kullanım yetkisine sahiptir." },
];

export function SettingsPage({
  currentUser,
  onCompanySaved,
  notifications,
  onNotificationsChange,
}: SettingsPageProps) {
  const [company, setCompany] = useState<CompanySettings>(emptyCompanySettings);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [selectedWalletUserId, setSelectedWalletUserId] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletNote, setWalletNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [walletSaving, setWalletSaving] = useState(false);
  const [companyMessage, setCompanyMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [walletMessage, setWalletMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [userError, setUserError] = useState("");
  const [walletError, setWalletError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [notificationError, setNotificationError] = useState("");

  const activeUsers = useMemo(
    () => users.filter((user) => user.isActive !== false).sort((left, right) => left.name.localeCompare(right.name, "tr")),
    [users],
  );

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setPageError("");

      try {
        const [companySettings, companyUsers, requests] = await Promise.all([
          settingsApi.getCompany(),
          usersApi.list(),
          walletApi.listRequests(),
        ]);

        if (!mounted) {
          return;
        }

        setCompany(companySettings);
        setUsers(companyUsers);
        setDepositRequests(requests);
        setSelectedWalletUserId((current) => current || companyUsers[0]?.id || "");
      } catch (caughtError) {
        if (!mounted) {
          return;
        }

        setPageError(caughtError instanceof Error ? caughtError.message : "Ayarlar yüklenemedi.");
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
    setCompanyError("");

    try {
      const saved = await settingsApi.saveCompany(company);
      setCompany(saved);
      onCompanySaved(saved);
      setCompanyMessage("Firma ayarları kaydedildi.");
    } catch (caughtError) {
      setCompanyError(caughtError instanceof Error ? caughtError.message : "Firma ayarları kaydedilemedi.");
    } finally {
      setCompanySaving(false);
    }
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserSaving(true);
    setUserError("");
    setUserMessage("");

    try {
      const user = await usersApi.create(userForm);
      setUsers((prev) => [...prev, user].sort((left, right) => left.createdAt.localeCompare(right.createdAt)));
      setUserForm(emptyUserForm);
      setUserMessage("Yeni kullanıcı eklendi.");
    } catch (caughtError) {
      setUserError(caughtError instanceof Error ? caughtError.message : "Kullanıcı oluşturulamadı.");
    } finally {
      setUserSaving(false);
    }
  };

  const handleToggleUser = async (user: AppUser, nextState: boolean) => {
    setUserError("");
    setUserMessage("");

    try {
      const updated = await usersApi.toggleActive(user.id, nextState);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setUserMessage(
        `${user.name} hesabı ${nextState ? "yeniden aktifleştirildi" : "pasife alındı"}.`,
      );
    } catch (caughtError) {
      setUserError(caughtError instanceof Error ? caughtError.message : "Kullanıcı durumu güncellenemedi.");
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setRequestError("");

    try {
      const result = await walletApi.approveRequest(requestId);
      setDepositRequests((prev) => prev.map((item) => (item.id === requestId ? result.request : item)));
      setUsers((prev) =>
        prev.map((user) =>
          user.id === result.request.requesterUserId ? { ...user, balance: result.balance } : user,
        ),
      );
    } catch (caughtError) {
      setRequestError(caughtError instanceof Error ? caughtError.message : "Talep onaylanamadı.");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setRequestError("");

    try {
      const request = await walletApi.rejectRequest(requestId);
      setDepositRequests((prev) => prev.map((item) => (item.id === requestId ? request : item)));
    } catch (caughtError) {
      setRequestError(caughtError instanceof Error ? caughtError.message : "Talep reddedilemedi.");
    }
  };

  const handleManualWalletAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWalletSaving(true);
    setWalletError("");
    setWalletMessage("");

    try {
      const balance = await reportsApi.manualWalletAdjustment({
        userId: selectedWalletUserId,
        amount: Number(walletAmount || 0),
        note: walletNote,
      });
      setUsers((prev) =>
        prev.map((user) => (user.id === selectedWalletUserId ? { ...user, balance } : user)),
      );
      setWalletAmount("");
      setWalletNote("");
      setWalletMessage("Manuel bakiye işlemi uygulandı.");
    } catch (caughtError) {
      setWalletError(caughtError instanceof Error ? caughtError.message : "Manuel bakiye işlemi yapılamadı.");
    } finally {
      setWalletSaving(false);
    }
  };

  const handleMarkNotificationsRead = async () => {
    setNotificationError("");

    try {
      await notificationsApi.markAllRead();
      onNotificationsChange(
        notifications.map((notification) => ({
          ...notification,
          readAt: notification.readAt || new Date().toISOString(),
        })),
      );
    } catch (caughtError) {
      setNotificationError(caughtError instanceof Error ? caughtError.message : "Bildirimler güncellenemedi.");
    }
  };

  const selectedWalletUser = users.find((user) => user.id === selectedWalletUserId);

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-ink-600">Ayarlar yükleniyor...</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
      {pageError && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 xl:col-span-2">
          {pageError}
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Firma Ayarları</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-900">{company.companyName || currentUser.companyName}</h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              Firma kimliğini, ödeme hesabını, satıcı bilgisini ve teklifte kullanılacak temel alanları buradan yönet.
            </p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">{currentUser.name}</p>
            <p>{currentUser.companyName}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Firma Admini</p>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSaveCompany}>
          <Field label="Firma adı">
            <input
              className="field"
              value={company.companyName}
              onChange={(event) => setCompany((prev) => ({ ...prev, companyName: event.target.value }))}
            />
          </Field>
          <Field label="Logo URL">
            <input
              className="field"
              placeholder="https://..."
              value={company.logoUrl}
              onChange={(event) => setCompany((prev) => ({ ...prev, logoUrl: event.target.value }))}
            />
          </Field>
          <Field label="Telefon">
            <input
              className="field"
              value={company.phone}
              onChange={(event) => setCompany((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </Field>
          <Field label="E-posta">
            <input
              className="field"
              value={company.email}
              onChange={(event) => setCompany((prev) => ({ ...prev, email: event.target.value }))}
            />
          </Field>
          <Field className="md:col-span-2" label="Adres">
            <textarea
              className="field min-h-[96px]"
              value={company.address}
              onChange={(event) => setCompany((prev) => ({ ...prev, address: event.target.value }))}
            />
          </Field>
          <Field className="md:col-span-2" label="Varsayılan satıcı bilgisi">
            <textarea
              className="field min-h-[120px]"
              value={company.sellerInfo}
              onChange={(event) => setCompany((prev) => ({ ...prev, sellerInfo: event.target.value }))}
            />
          </Field>
          <Field className="md:col-span-2" label="Firma notu">
            <textarea
              className="field min-h-[96px]"
              placeholder="Platform yöneticisine veya iç ekibe not..."
              value={company.notes || ""}
              onChange={(event) => setCompany((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </Field>
          <Field label="Bakiye yükleme alıcı adı">
            <input
              className="field"
              placeholder="Ad Soyad"
              value={company.paymentAccountName}
              onChange={(event) => setCompany((prev) => ({ ...prev, paymentAccountName: event.target.value }))}
            />
          </Field>
          <Field label="IBAN">
            <input
              className="field"
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              value={company.paymentIban}
              onChange={(event) => setCompany((prev) => ({ ...prev, paymentIban: event.target.value }))}
            />
          </Field>

          {companyError && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
              {companyError}
            </div>
          )}
          {companyMessage && (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 md:col-span-2">
              {companyMessage}
            </div>
          )}

          <div className="md:col-span-2">
            <Button disabled={companySaving} type="submit" variant="primary">
              {companySaving ? "Kaydediliyor..." : "Firma Ayarlarını Kaydet"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Kullanıcı Yönetimi</p>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">Firma içi hesaplar</h2>
            <p className="mt-2 text-sm text-ink-600">
              Kullanıcı ekle, rol ver, pasife al veya yeniden aktifleştir.
            </p>
          </div>
          <span className="rounded-xl bg-ink-100 px-3 py-2 text-xs font-medium text-ink-700">
            {users.length} kullanıcı
          </span>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleCreateUser}>
          <Field label="Ad soyad">
            <input
              className="field"
              placeholder="Örn. Ahmet Yılmaz"
              value={userForm.name}
              onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </Field>
          <Field label="E-posta">
            <input
              className="field"
              placeholder="ornek@firma.com"
              type="email"
              value={userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </Field>
          <Field label="Geçici parola">
            <input
              className="field"
              placeholder="İlk girişte kullanılacak parola"
              type="password"
              value={userForm.password}
              onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </Field>
          <Field label="Yetki">
            <select
              className="field"
              value={userForm.role}
              onChange={(event) =>
                setUserForm((prev) => ({ ...prev, role: event.target.value as AppUser["role"] }))
              }
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="rounded-2xl border border-ink-200 bg-ink-50/80 px-4 py-3 text-sm text-ink-600 md:col-span-2">
            Seçtiğin rol kullanıcının görünür menülerini ve ağırlıklı iş akışını belirler. Farklı firma açma
            işlemi ise sadece <span className="font-semibold text-ink-900">Site Yönetimi</span> panelindedir.
          </div>

          {userError && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
              {userError}
            </div>
          )}
          {userMessage && (
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 md:col-span-2">
              {userMessage}
            </div>
          )}

          <div className="md:col-span-2">
            <Button disabled={userSaving} type="submit" variant="secondary">
              {userSaving ? "Kullanıcı ekleniyor..." : "Kullanıcı Ekle"}
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-3">
          {users.map((user) => {
            const canToggle = user.id !== currentUser.id && !user.isPlatformAdmin;
            return (
              <div key={user.id} className="rounded-2xl border border-ink-200 bg-ink-50/80 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
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
                    <p className="mt-1 text-sm font-medium text-red-600">Bakiye: {formatCurrency(user.balance || 0)}</p>
                    <p className="mt-1 text-xs text-ink-500">Eklenme: {formatDateTime(user.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-600 ring-1 ring-ink-200">
                      {roleOptions.find((option) => option.value === user.role)?.label || user.role}
                    </span>
                    {canToggle ? (
                      <Button
                        type="button"
                        variant={user.isActive !== false ? "ghost" : "primary"}
                        onClick={() => void handleToggleUser(user, user.isActive === false)}
                      >
                        {user.isActive !== false ? "Pasife Al" : "Aktifleştir"}
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-500">
                        {user.id === currentUser.id ? "Aktif oturum" : "Platform admin"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 xl:col-span-2">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Bakiye Talepleri</p>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">Onay bekleyen yüklemeler</h2>
            <p className="mt-2 text-sm text-ink-600">
              Kullanıcılar havale yaptıktan sonra talep oluşturur. Onaylandığında bakiye defterine işlenir.
            </p>

            <div className="mt-5 space-y-3">
              {requestError && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{requestError}</div>
              )}

              {depositRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500">
                  Henüz bakiye talebi yok.
                </div>
              ) : (
                depositRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-ink-200 bg-ink-50/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink-900">{request.requesterName}</p>
                        <p className="mt-1 text-sm text-ink-600">
                          {request.requesterEmail} • {formatCurrency(request.amount)}
                        </p>
                        <p className="mt-1 text-xs text-ink-500">Talep: {formatDateTime(request.createdAt)}</p>
                        {request.note && <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{request.note}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {request.status === "pending" ? (
                          <>
                            <Button type="button" variant="primary" onClick={() => void handleApproveRequest(request.id)}>
                              Onayla
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => void handleRejectRequest(request.id)}>
                              Reddet
                            </Button>
                          </>
                        ) : (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-600 ring-1 ring-ink-200">
                            {request.status === "approved" ? "Onaylandı" : "Reddedildi"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Manuel Bakiye İşlemi</p>
            <h3 className="mt-2 text-xl font-semibold text-ink-900">Cari düzeltme</h3>
            <p className="mt-2 text-sm text-ink-600">
              Onay dışı kredi, tahsilat veya düzeltme işlemlerini kayıt altına alın.
            </p>

            <form className="mt-5 space-y-3" onSubmit={handleManualWalletAdjustment}>
              <select
                className="field"
                value={selectedWalletUserId}
                onChange={(event) => setSelectedWalletUserId(event.target.value)}
              >
                {activeUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {roleOptions.find((option) => option.value === user.role)?.label || user.role}
                  </option>
                ))}
              </select>
              <input
                className="field"
                inputMode="decimal"
                placeholder="Örn. 250 veya -50"
                value={walletAmount}
                onChange={(event) => setWalletAmount(event.target.value)}
              />
              <textarea
                className="field min-h-[100px]"
                placeholder="İşlem notu"
                value={walletNote}
                onChange={(event) => setWalletNote(event.target.value)}
              />
              {selectedWalletUser && (
                <div className="rounded-2xl border border-ink-200 bg-white/90 px-4 py-3 text-sm text-ink-700">
                  <p className="font-semibold text-ink-900">{selectedWalletUser.name}</p>
                  <p className="mt-1">Mevcut bakiye: {formatCurrency(selectedWalletUser.balance || 0)}</p>
                </div>
              )}
              {walletError && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{walletError}</div>}
              {walletMessage && (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{walletMessage}</div>
              )}
              <Button disabled={walletSaving || !selectedWalletUserId} type="submit" variant="primary">
                {walletSaving ? "İşleniyor..." : "Bakiye Hareketi Kaydet"}
              </Button>
            </form>
          </div>
        </div>
      </Card>

      <Card className="p-6 xl:col-span-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Panel Bildirimleri</p>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">Uygulama içi bildirim akışı</h2>
          </div>
          <Button type="button" onClick={() => void handleMarkNotificationsRead()}>
            Tümünü Okundu Yap
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {notificationError && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{notificationError}</div>
          )}

          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500">
              Henüz bildirim yok.
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-4 ${
                  notification.readAt ? "border-ink-200 bg-white/80" : "border-red-200 bg-red-50/70"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{notification.title}</p>
                    <p className="mt-2 text-sm text-ink-700">{notification.message}</p>
                    <p className="mt-2 text-xs text-ink-500">{formatDateTime(notification.createdAt)}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-600 ring-1 ring-ink-200">
                    {notification.readAt ? "Okundu" : "Yeni"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span className="text-sm font-medium text-ink-700">{label}</span>
      {children}
    </label>
  );
}
