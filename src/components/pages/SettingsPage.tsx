import { useEffect, useState } from "react";
import type { AppNotification, AppUser, CompanySettings, DepositRequest } from "../../types/quote";
import { notificationsApi, settingsApi, usersApi, walletApi } from "../../utils/api";
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
  createdAt: "",
};

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "staff" as "admin" | "staff",
};

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
  const [loading, setLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [companyMessage, setCompanyMessage] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [userError, setUserError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [notificationError, setNotificationError] = useState("");

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
    setUserMessage("");
    setUserError("");

    try {
      const user = await usersApi.create(userForm);
      setUsers((prev) => [...prev, user].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setUserForm(emptyUserForm);
      setUserMessage("Yeni kullanıcı eklendi.");
    } catch (caughtError) {
      setUserError(caughtError instanceof Error ? caughtError.message : "Kullanıcı oluşturulamadı.");
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (user: AppUser) => {
    const confirmed = window.confirm(
      `${user.name} adlı kullanıcıyı silmek istediğine emin misin? Bu işlem geri alınamaz.`,
    );

    if (!confirmed) {
      return;
    }

    setUserError("");
    setUserMessage("");

    try {
      await usersApi.delete(user.id);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      setUserMessage(`${user.name} kullanıcısı silindi.`);
    } catch (caughtError) {
      setUserError(caughtError instanceof Error ? caughtError.message : "Kullanıcı silinemedi.");
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
      setNotificationError(
        caughtError instanceof Error ? caughtError.message : "Bildirimler güncellenemedi.",
      );
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-ink-600">Ayarlar yükleniyor...</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      {pageError && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 xl:col-span-2">
          {pageError}
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Firma Ayarları</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-900">
              {company.companyName || currentUser.companyName}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-600">
              Firma kimliğini, tekliflerde kullanılacak iletişim bilgisini ve bakiye yükleme hesap
              bilgilerini tek yerden yönet.
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-900">{currentUser.name}</p>
            <p>{currentUser.companyName}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-500">
              {currentUser.role === "admin" ? "Firma Admini" : "Personel"}
            </p>
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
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">Bakiye yükleme alıcı adı</span>
            <input
              className="field"
              placeholder="Ad Soyad"
              value={company.paymentAccountName}
              onChange={(event) =>
                setCompany((prev) => ({ ...prev, paymentAccountName: event.target.value }))
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">IBAN</span>
            <input
              className="field"
              placeholder="TR00 0000 0000 0000 0000 0000 00"
              value={company.paymentIban}
              onChange={(event) => setCompany((prev) => ({ ...prev, paymentIban: event.target.value }))}
            />
          </label>

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

          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <Button disabled={companySaving} type="submit" variant="primary">
              {companySaving ? "Kaydediliyor..." : "Firma Ayarlarını Kaydet"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">
              Kullanıcı Yönetimi
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">Firma içi kullanıcılar</h2>
            <p className="mt-2 text-sm text-ink-600">
              Bu alan yalnızca mevcut firmanın personel ve admin hesapları içindir.
            </p>
          </div>
          <div className="rounded-xl bg-ink-100 px-3 py-2 text-xs font-medium text-ink-700">
            {users.length} kullanıcı
          </div>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleCreateUser}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">Ad soyad</span>
            <input
              className="field"
              placeholder="Örn. Ahmet Yılmaz"
              value={userForm.name}
              onChange={(event) => setUserForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">E-posta</span>
            <input
              className="field"
              placeholder="ornek@firma.com"
              type="email"
              value={userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">Geçici parola</span>
            <input
              className="field"
              placeholder="İlk girişte paylaşılacak parola"
              type="password"
              value={userForm.password}
              onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-ink-700">Yetki</span>
            <select
              className="field"
              value={userForm.role}
              onChange={(event) =>
                setUserForm((prev) => ({
                  ...prev,
                  role: event.target.value === "admin" ? "admin" : "staff",
                }))
              }
            >
              <option value="staff">Personel</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <div className="rounded-2xl border border-ink-200 bg-ink-50/80 px-4 py-3 text-sm text-ink-600 md:col-span-2">
            Buradan açılan kullanıcılar sadece bu firmaya bağlı olur. Farklı firma açma işlemi artık
            ayrı `Site Yönetimi` panelindedir.
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
            const canDelete = user.id !== currentUser.id && !user.isPlatformAdmin;

            return (
              <div key={user.id} className="rounded-2xl border border-ink-200 bg-ink-50/80 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink-900">{user.name}</p>
                    <p className="mt-1 text-sm text-ink-600">{user.email}</p>
                    <p className="mt-1 text-sm font-medium text-red-600">
                      Bakiye: {formatCurrency(user.balance || 0)}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">Eklenme: {formatDateTime(user.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-600 ring-1 ring-ink-200">
                      {user.role === "admin" ? "Admin" : "Personel"}
                    </div>
                    {canDelete ? (
                      <Button type="button" variant="danger" onClick={() => void handleDeleteUser(user)}>
                        Kullanıcıyı Sil
                      </Button>
                    ) : (
                      <span className="text-xs text-ink-500">
                        {user.id === currentUser.id
                          ? "Aktif kullanıcı"
                          : user.isPlatformAdmin
                            ? "Platform admin"
                            : ""}
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">
              Bakiye Talepleri
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">Onay bekleyen yükleme istekleri</h2>
            <p className="mt-2 text-sm text-ink-600">
              Kullanıcılar havale yaptıktan sonra burada talep oluşturur. Kontrol edip onayladığında
              bakiye kullanıcıya eklenir.
            </p>
          </div>
          <div className="rounded-xl bg-ink-100 px-3 py-2 text-xs font-medium text-ink-700">
            {depositRequests.filter((request) => request.status === "pending").length} bekleyen talep
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {requestError && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {requestError}
            </div>
          )}

          {depositRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500">
              Henüz bakiye yükleme talebi yok.
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
                    <p className="mt-1 text-xs text-ink-500">
                      Talep: {formatDateTime(request.createdAt)}
                    </p>
                    {request.note && (
                      <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{request.note}</p>
                    )}
                    {request.status !== "pending" && (
                      <p className="mt-2 text-xs text-ink-500">
                        İşlem: {request.status === "approved" ? "Onaylandı" : "Reddedildi"}
                        {request.approvedByName ? ` • ${request.approvedByName}` : ""} •{" "}
                        {formatDateTime(request.updatedAt)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {request.status === "pending" ? (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => void handleApproveRequest(request.id)}
                        >
                          Onayla
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => void handleRejectRequest(request.id)}
                        >
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
      </Card>

      <Card className="p-6 xl:col-span-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">
              Panel Bildirimleri
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">Uygulama içi bildirim akışı</h2>
          </div>
          <Button type="button" onClick={() => void handleMarkNotificationsRead()}>
            Tümünü Okundu Yap
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          {notificationError && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {notificationError}
            </div>
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
