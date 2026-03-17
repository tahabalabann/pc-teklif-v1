import { useEffect, useMemo, useState } from "react";
import type { AppUser, AuditLogEntry, CompanyReportSummary, DashboardSummary, WalletLedgerEntry } from "../../types/quote";
import { reportsApi } from "../../utils/api";
import { formatDateTime } from "../../utils/date";
import { formatCurrency } from "../../utils/money";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

const emptySummary: DashboardSummary = {
  todayQuotes: 0,
  todayShipments: 0,
  pendingDepositRequests: 0,
  lowBalanceUsers: 0,
};

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [companyReports, setCompanyReports] = useState<CompanyReportSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const lowBalanceUsers = useMemo(
    () =>
      users
        .filter((user) => user.isActive !== false && user.role !== "admin" && Number(user.balance || 0) < 150)
        .sort((left, right) => Number(left.balance || 0) - Number(right.balance || 0)),
    [users],
  );

  const shippingAverages = useMemo(
    () => [...companyReports].sort((left, right) => right.totalProfit - left.totalProfit),
    [companyReports],
  );

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryResult, usersResult, reportsResult, auditResult, walletResult] = await Promise.all([
        reportsApi.dashboard(),
        reportsApi.users(),
        reportsApi.companies(),
        reportsApi.auditLogs(),
        reportsApi.walletLedger(),
      ]);

      setSummary(summaryResult);
      setUsers(usersResult);
      setCompanyReports(reportsResult);
      setAuditLogs(auditResult);
      setWalletLedger(walletResult);
      setSelectedUserId((current) => current || usersResult[0]?.id || "");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Dashboard verileri alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const handleManualAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const balance = await reportsApi.manualWalletAdjustment({
        userId: selectedUserId,
        amount: Number(adjustAmount || 0),
        note: adjustNote,
      });

      setUsers((prev) =>
        prev.map((user) => (user.id === selectedUserId ? { ...user, balance } : user)),
      );
      setAdjustAmount("");
      setAdjustNote("");
      setMessage("Manuel bakiye işlemi kaydedildi.");
      await loadDashboard();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Manuel bakiye işlemi yapılamadı.");
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = users.find((user) => user.id === selectedUserId);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Dashboard</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink-900">Günlük operasyon özeti</h2>
            <p className="mt-2 max-w-3xl text-sm text-ink-600">
              Teklif, kargo, bakiye ve firma verilerini tek ekrandan takip edin. Bu alan yönetici
              kullanımına yöneliktir.
            </p>
          </div>
          <Button onClick={() => void loadDashboard()} type="button" variant="secondary">
            Yenile
          </Button>
        </div>

        {error && <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Bugün Verilen Teklif" value={String(summary.todayQuotes)} />
          <MetricCard label="Bugün Üretilen Kargo" value={String(summary.todayShipments)} />
          <MetricCard label="Bekleyen Bakiye Talebi" value={String(summary.pendingDepositRequests)} />
          <MetricCard
            label="Düşük Bakiyeli Kullanıcı"
            tone={summary.lowBalanceUsers > 0 ? "warning" : "neutral"}
            value={String(summary.lowBalanceUsers)}
          />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Firma Raporları</p>
              <h3 className="mt-2 text-xl font-semibold text-ink-900">Firma bazlı performans</h3>
            </div>
            <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">
              {companyReports.length} firma
            </span>
          </div>

          {loading ? (
            <div className="mt-5 rounded-2xl border border-dashed border-ink-200 px-4 py-6 text-sm text-ink-500">
              Raporlar yükleniyor...
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-ink-50 text-left text-xs uppercase tracking-[0.14em] text-ink-500">
                  <tr>
                    <th className="px-3 py-3">Firma</th>
                    <th className="px-3 py-3 text-right">Teklif</th>
                    <th className="px-3 py-3 text-right">Kargo</th>
                    <th className="px-3 py-3 text-right">Yükleme</th>
                    <th className="px-3 py-3 text-right">Kâr</th>
                    <th className="px-3 py-3 text-right">Ort. Maliyet</th>
                  </tr>
                </thead>
                <tbody>
                  {shippingAverages.map((report) => (
                    <tr key={report.companyId} className="border-t border-ink-100">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink-900">{report.companyName}</span>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              report.active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {report.active ? "Aktif" : "Pasif"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-500">{report.userCount} kullanıcı</p>
                      </td>
                      <td className="px-3 py-3 text-right text-ink-700">{report.totalQuotes}</td>
                      <td className="px-3 py-3 text-right text-ink-700">{report.totalShipments}</td>
                      <td className="px-3 py-3 text-right font-medium text-ink-900">
                        {formatCurrency(report.totalDeposits)}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-semibold ${
                          report.totalProfit >= 0 ? "text-emerald-700" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(report.totalProfit)}
                      </td>
                      <td className="px-3 py-3 text-right text-ink-700">
                        {formatCurrency(report.averageShippingCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Hızlı Müdahale</p>
          <h3 className="mt-2 text-xl font-semibold text-ink-900">Manuel bakiye işlemi</h3>
          <p className="mt-2 text-sm text-ink-600">
            Onay dışı bakiye düzeltmelerini, manuel tahsilat veya düşüm işlemlerini kayıt altına alın.
          </p>

          <form className="mt-5 space-y-3" onSubmit={handleManualAdjustment}>
            <select
              className="field"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.companyName}
                </option>
              ))}
            </select>
            <input
              className="field"
              inputMode="decimal"
              placeholder="Örn. 250 veya -75"
              value={adjustAmount}
              onChange={(event) => setAdjustAmount(event.target.value)}
            />
            <textarea
              className="field min-h-[110px]"
              placeholder="İşlem notu"
              value={adjustNote}
              onChange={(event) => setAdjustNote(event.target.value)}
            />
            {selectedUser && (
              <div className="rounded-2xl border border-ink-200 bg-ink-50/80 px-4 py-3 text-sm text-ink-700">
                <p className="font-semibold text-ink-900">{selectedUser.name}</p>
                <p className="mt-1">{selectedUser.companyName}</p>
                <p className="mt-1 text-red-600">Mevcut bakiye: {formatCurrency(selectedUser.balance || 0)}</p>
              </div>
            )}
            {message && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
            <Button disabled={saving || !selectedUserId} type="submit" variant="primary">
              {saving ? "İşleniyor..." : "Bakiye Hareketi Kaydet"}
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Bakiye Defteri</p>
              <h3 className="mt-2 text-xl font-semibold text-ink-900">Son bakiye hareketleri</h3>
            </div>
            <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">
              {walletLedger.length} kayıt
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {walletLedger.slice(0, 10).map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-ink-200 bg-white/90 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{entry.userName}</p>
                    <p className="mt-1 text-sm text-ink-600">{entry.companyName}</p>
                    <p className="mt-2 text-xs text-ink-500">{formatDateTime(entry.createdAt)}</p>
                    {entry.note && <p className="mt-2 text-sm text-ink-700">{entry.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${entry.amount >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {entry.amount >= 0 ? "+" : ""}
                      {formatCurrency(entry.amount)}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">Bakiye: {formatCurrency(entry.balanceAfter)}</p>
                    <p className="mt-1 text-xs text-ink-500">{entry.createdByName || "Sistem"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Hareket Geçmişi</p>
              <h3 className="mt-2 text-xl font-semibold text-ink-900">Son kullanıcı işlemleri</h3>
            </div>
            <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-600">
              {auditLogs.length} kayıt
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {auditLogs.slice(0, 12).map((log) => (
              <div key={log.id} className="rounded-2xl border border-ink-200 bg-white/90 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink-900">{log.message}</p>
                    <p className="mt-1 text-sm text-ink-600">{log.companyName || "Platform"}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink-500">
                      {log.action} • {log.entityType}
                    </p>
                  </div>
                  <p className="text-xs text-ink-500">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-500">Düşük Bakiye</p>
            <h3 className="mt-2 text-xl font-semibold text-ink-900">Kritik seviyedeki kullanıcılar</h3>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {lowBalanceUsers.length} kullanıcı
          </span>
        </div>

        {lowBalanceUsers.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-ink-200 px-4 py-6 text-sm text-ink-500">
            Kritik seviyede bakiye kalmadı.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {lowBalanceUsers.map((user) => (
              <div key={user.id} className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
                <p className="font-semibold text-ink-900">{user.name}</p>
                <p className="mt-1 text-sm text-ink-600">{user.companyName}</p>
                <p className="mt-2 text-sm font-semibold text-red-600">{formatCurrency(user.balance || 0)}</p>
                <p className="mt-1 text-xs text-ink-500">{user.role}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 ${
        tone === "warning" ? "border-amber-200 bg-amber-50/70" : "border-ink-200 bg-white/90"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}
