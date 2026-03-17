import { useEffect, useMemo, useState } from "react";
import type { AppUser, CompanySettings, DepositRequest, Quote, ShipmentRecord, WalletSummary } from "../../types/quote";
import { shipmentRecordsApi, walletApi } from "../../utils/api";
import { formatDateTime, formatDisplayDate } from "../../utils/date";
import { formatCurrency } from "../../utils/money";
import { calculateGrandTotal, createEmptyQuote, sanitizeQuote, touchQuote } from "../../utils/quote";
import { GeliverShippingPanel } from "../shipping/GeliverShippingPanel";
import { SavedQuotesPanel } from "../saved/SavedQuotesPanel";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface ShippingPageProps {
  activeQuote: Quote;
  savedQuotes: Quote[];
  currentUser: AppUser;
  companySettings: CompanySettings | null;
  onPatchQuote: (patch: Partial<Quote>) => void;
  onOpenQuote: (id: string) => void;
  onDuplicateQuote: (id: string) => void;
  onDeleteQuote: (id: string) => void;
  onCurrentUserBalanceChange: (balance: number) => void;
}

type ShippingMode = "quote" | "standalone";

type ShippingHistoryItem =
  | { kind: "quote"; id: string; quote: Quote }
  | { kind: "standalone"; id: string; record: ShipmentRecord };

const emptyWallet: WalletSummary = {
  balance: 0,
  requests: [],
};

const MINIMUM_SHIPPING_BALANCE = 150;

export function ShippingPage({
  activeQuote,
  savedQuotes,
  currentUser,
  companySettings,
  onPatchQuote,
  onOpenQuote,
  onDuplicateQuote,
  onDeleteQuote,
  onCurrentUserBalanceChange,
}: ShippingPageProps) {
  const normalizedSavedQuotes = useMemo(() => savedQuotes.map(sanitizeQuote), [savedQuotes]);
  const [shipmentQuery, setShipmentQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("Tümü");
  const [shippingMode, setShippingMode] = useState<ShippingMode>("quote");
  const [standaloneDraft, setStandaloneDraft] = useState<Quote>(() => createStandaloneDraft(activeQuote));
  const [standaloneShipments, setStandaloneShipments] = useState<ShipmentRecord[]>([]);
  const [wallet, setWallet] = useState<WalletSummary>(emptyWallet);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositLoading, setDepositLoading] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [walletError, setWalletError] = useState("");

  useEffect(() => {
    void Promise.all([shipmentRecordsApi.list(), walletApi.getSummary()])
      .then(([records, walletSummary]) => {
        setStandaloneShipments(records);
        setWallet(walletSummary);
        onCurrentUserBalanceChange(walletSummary.balance);
      })
      .catch(() => {
        setStandaloneShipments([]);
      });
  }, [onCurrentUserBalanceChange]);

  useEffect(() => {
    if (shippingMode !== "standalone") {
      return;
    }

    setStandaloneDraft((prev) => preserveStandaloneRecipient(prev, activeQuote, companySettings));
  }, [activeQuote, companySettings, shippingMode]);

  const shipmentHistory = useMemo<ShippingHistoryItem[]>(() => {
    const quoteItems: ShippingHistoryItem[] = normalizedSavedQuotes
      .filter((quote) => quote.geliverShipment)
      .map((quote) => ({ kind: "quote", id: quote.id, quote }));

    const standaloneItems: ShippingHistoryItem[] = standaloneShipments.map((record) => ({
      kind: "standalone",
      id: record.id,
      record,
    }));

    return [...quoteItems, ...standaloneItems]
      .filter((item) => {
        const shipment = item.kind === "quote" ? item.quote.geliverShipment : item.record.shipment;
        if (!shipment) {
          return false;
        }

        const haystack =
          item.kind === "quote"
            ? [
                item.quote.customerName,
                item.quote.quoteNo,
                shipment.barcode,
                shipment.trackingNumber,
                shipment.providerName,
                shipment.providerServiceCode,
              ]
            : [
                item.record.customerName,
                item.record.quoteNo,
                shipment.barcode,
                shipment.trackingNumber,
                shipment.providerName,
                shipment.providerServiceCode,
              ];

        const matchesQuery =
          !shipmentQuery ||
          haystack.join(" ").toLocaleLowerCase("tr").includes(shipmentQuery.toLocaleLowerCase("tr"));
        const matchesProvider = providerFilter === "Tümü" || shipment.providerName === providerFilter;
        return matchesQuery && matchesProvider;
      })
      .sort((left, right) => getHistoryUpdatedAt(right).localeCompare(getHistoryUpdatedAt(left)))
      .slice(0, 20);
  }, [normalizedSavedQuotes, providerFilter, shipmentQuery, standaloneShipments]);

  const providerOptions = useMemo(() => {
    const providers = new Set<string>();
    normalizedSavedQuotes.forEach((quote) => {
      if (quote.geliverShipment?.providerName) {
        providers.add(quote.geliverShipment.providerName);
      }
    });
    standaloneShipments.forEach((record) => {
      if (record.shipment.providerName) {
        providers.add(record.shipment.providerName);
      }
    });
    return ["Tümü", ...providers];
  }, [normalizedSavedQuotes, standaloneShipments]);

  const standaloneSummary = useMemo(() => sanitizeQuote(standaloneDraft), [standaloneDraft]);
  const pendingWalletRequests = wallet.requests.filter((request) => request.status === "pending");
  const shippingBlockedForLowBalance = currentUser.role !== "admin" && wallet.balance < MINIMUM_SHIPPING_BALANCE;
  const lowBalanceMessage =
    currentUser.role !== "admin"
      ? `Kargo kodu oluşturmak için minimum bakiye ${formatCurrency(MINIMUM_SHIPPING_BALANCE)} olmalıdır. Mevcut bakiyeniz: ${formatCurrency(wallet.balance)}`
      : "";

  const patchStandaloneQuote = (patch: Partial<Quote>) => {
    setStandaloneDraft((prev) => touchQuote(sanitizeQuote({ ...prev, ...patch })));
  };

  const fillStandaloneFromActiveCustomer = () => {
    const source = sanitizeQuote(activeQuote);
    setStandaloneDraft((prev) =>
      sanitizeQuote({
        ...prev,
        customerName: source.customerName,
        companyName: source.companyName,
        geliverRecipient: {
          ...prev.geliverRecipient,
          ...source.geliverRecipient,
          fullName: source.geliverRecipient.fullName || source.customerName || prev.geliverRecipient.fullName,
        },
      }),
    );
  };

  const refreshWalletSummary = async () => {
    const walletSummary = await walletApi.getSummary();
    setWallet(walletSummary);
    onCurrentUserBalanceChange(walletSummary.balance);
  };

  const handleStandaloneShipmentCreated = async (shipment: ShipmentRecord["shipment"], quoteSnapshot: Quote) => {
    const record: ShipmentRecord = {
      id: `shipment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      standalone: true,
      quoteId: "",
      quoteNo: quoteSnapshot.quoteNo || buildStandaloneShipmentNo(),
      customerName: quoteSnapshot.customerName || quoteSnapshot.geliverRecipient.fullName || "Bağımsız Kargo",
      companyName: quoteSnapshot.companyName || activeQuote.companyName || "",
      recipientName: quoteSnapshot.geliverRecipient.fullName || quoteSnapshot.customerName || "",
      providerName: shipment.providerName || "",
      createdAt: shipment.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      shipment,
    };

    try {
      const saved = await shipmentRecordsApi.save(record);
      setStandaloneShipments((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      setStandaloneDraft(createStandaloneDraft(activeQuote, companySettings));
      await refreshWalletSummary();
    } catch {
      // The shipment itself already exists in Geliver; keep local UI state intact if history save fails.
    }
  };

  const handleDeleteStandaloneShipment = async (shipmentId: string) => {
    try {
      await shipmentRecordsApi.delete(shipmentId);
      setStandaloneShipments((prev) => prev.filter((item) => item.id !== shipmentId));
    } catch {
      // Best effort delete for history management.
    }
  };

  const handleCreateDepositRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDepositLoading(true);
    setWalletError("");
    setWalletMessage("");

    try {
      const request = await walletApi.createRequest({
        amount: Number(depositAmount || 0),
        note: depositNote,
      });
      setWallet((prev) => ({ ...prev, requests: [request, ...prev.requests] }));
      setDepositAmount("");
      setDepositNote("");
      setWalletMessage("Bakiye yükleme talebi oluşturuldu. Havalenizi kontrol ettikten sonra onaylayabilirsiniz.");
    } catch (caughtError) {
      setWalletError(caughtError instanceof Error ? caughtError.message : "Bakiye talebi oluşturulamadı.");
    } finally {
      setDepositLoading(false);
    }
  };

  const copyToClipboard = async (value: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Best effort only.
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Kargo</p>
              <h2 className="mt-2 text-lg font-semibold text-ink-900">Teklifli veya bağımsız kargo oluştur</h2>
              <p className="mt-1 text-sm text-ink-600">
                Seçili teklif ile çalışabilir ya da teklif seçmeden düz bir kargo kodu oluşturabilirsiniz.
              </p>
            </div>

            <div className="inline-flex rounded-2xl border border-ink-200 bg-white p-1">
              <button
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  shippingMode === "quote" ? "bg-red-600 text-white" : "text-ink-600"
                }`}
                onClick={() => setShippingMode("quote")}
                type="button"
              >
                Aktif Teklifle
              </button>
              <button
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  shippingMode === "standalone" ? "bg-red-600 text-white" : "text-ink-600"
                }`}
                onClick={() => setShippingMode("standalone")}
                type="button"
              >
                Teklifsiz Kargo
              </button>
            </div>
          </div>

          {shippingMode === "quote" ? (
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <Info label="Müşteri" value={activeQuote.customerName || "-"} />
              <Info label="Firma" value={activeQuote.companyName || "-"} />
              <Info label="Tarih" value={formatDisplayDate(activeQuote.date)} />
              <Info label="Toplam" value={formatCurrency(calculateGrandTotal(activeQuote))} />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <Info label="Kargo No" value={standaloneSummary.quoteNo} />
              <Info label="Alıcı" value={standaloneSummary.geliverRecipient.fullName || "-"} />
              <Info label="Gönderici" value={standaloneSummary.geliverSender.fullName || standaloneSummary.companyName || "-"} />
              <Info label="Durum" value={standaloneSummary.geliverShipment?.status || "Hazır"} />
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-500">Kargo Bakiyesi</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-900">{formatCurrency(wallet.balance)}</h3>
              <p className="mt-2 text-sm text-ink-600">
                {currentUser.role === "admin"
                  ? "Admin hesabı bakiyeyi referans amaçlı görür. Personel kullanıcılarında kargo tutarı otomatik düşer."
                  : "Kargo oluşturulduğunda tutar bu bakiyeden düşer. Yetersiz bakiye varsa önce yükleme talebi oluşturun."}
              </p>
              {shippingBlockedForLowBalance && (
                <p className="mt-3 text-sm font-semibold text-amber-700">{lowBalanceMessage}</p>
              )}
              <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-50/80 p-4 text-sm text-ink-700">
                <p className="font-semibold text-ink-900">Bakiye yükleme bilgisi</p>
                <p className="mt-2">Alıcı: {companySettings?.paymentAccountName || "Henüz tanımlanmadı"}</p>
                <p className="mt-1 break-all">IBAN: {companySettings?.paymentIban || "Henüz tanımlanmadı"}</p>
                {pendingWalletRequests.length > 0 && (
                  <p className="mt-3 text-xs font-semibold text-red-600">
                    {pendingWalletRequests.length} adet onay bekleyen yükleme talebiniz var.
                  </p>
                )}
              </div>
            </div>

            <form className="space-y-3" onSubmit={handleCreateDepositRequest}>
              <div>
                <p className="text-sm font-semibold text-ink-900">Bakiye yükleme talebi oluştur</p>
                <p className="mt-1 text-sm text-ink-600">
                  Havale yaptıktan sonra tutarı ve açıklamayı girin. Admin onaylayınca bakiye hesabınıza eklenir.
                </p>
              </div>

              <input
                className="field"
                inputMode="decimal"
                placeholder="Tutar (TL)"
                value={depositAmount}
                onChange={(event) => setDepositAmount(event.target.value)}
              />
              <textarea
                className="field min-h-[110px]"
                placeholder="Açıklama / havale notu"
                value={depositNote}
                onChange={(event) => setDepositNote(event.target.value)}
              />

              {walletError && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{walletError}</div>}
              {walletMessage && (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{walletMessage}</div>
              )}

              <Button disabled={depositLoading} type="submit" variant="primary">
                {depositLoading ? "Talep Gönderiliyor..." : "Yükleme Talebi Oluştur"}
              </Button>
            </form>
          </div>

          {wallet.requests.length > 0 && (
            <div className="mt-5 space-y-3">
              <p className="text-sm font-semibold text-ink-900">Son bakiye talepleriniz</p>
              {wallet.requests.slice(0, 5).map((request: DepositRequest) => (
                <div key={request.id} className="rounded-2xl border border-ink-200 bg-white/90 p-4 text-sm text-ink-700">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-900">{formatCurrency(request.amount)}</p>
                      <p className="mt-1 text-xs text-ink-500">Talep: {formatDateTime(request.createdAt)}</p>
                      {request.note && <p className="mt-2 whitespace-pre-line">{request.note}</p>}
                    </div>
                    <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700">
                      {request.status === "pending" ? "Bekliyor" : request.status === "approved" ? "Onaylandı" : "Reddedildi"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {shippingMode === "quote" ? (
          <GeliverShippingPanel
            quote={activeQuote}
            onChange={onPatchQuote}
            mode="quote"
            onShipmentCreated={() => void refreshWalletSummary()}
            disableSubmit={shippingBlockedForLowBalance}
            disabledReason={lowBalanceMessage}
          />
        ) : (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Hızlı Doldur</p>
                  <p className="mt-1 text-sm text-ink-600">
                    Seçili tekliften müşteri adresini tek tuşla teklifsiz kargo formuna aktarın.
                  </p>
                </div>
                <button
                  className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
                  onClick={fillStandaloneFromActiveCustomer}
                  type="button"
                >
                  Müşteri Adresinden Doldur
                </button>
              </div>
            </Card>

            <GeliverShippingPanel
              quote={standaloneSummary}
              onChange={patchStandaloneQuote}
              mode="standalone"
              onShipmentCreated={handleStandaloneShipmentCreated}
              disableSubmit={shippingBlockedForLowBalance}
              disabledReason={lowBalanceMessage}
            />
          </div>
        )}

        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-ink-900">Kargo Geçmişi</h3>
              <p className="mt-1 text-sm text-ink-600">
                Teklife bağlı gönderilerle bağımsız kargo kayıtları aynı listede tutulur.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <input
              className="field"
              placeholder="Müşteri, teklif no, barkod veya takip ara"
              value={shipmentQuery}
              onChange={(event) => setShipmentQuery(event.target.value)}
            />
            <select className="field" value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}>
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>

          {shipmentHistory.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-5 text-sm text-ink-500">
              Filtreye uygun bir Geliver gönderisi bulunamadı.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {shipmentHistory.map((item) => {
                const shipment = item.kind === "quote" ? item.quote.geliverShipment : item.record.shipment;
                if (!shipment) {
                  return null;
                }

                const title =
                  item.kind === "quote"
                    ? item.quote.customerName || "Adsız Müşteri"
                    : item.record.customerName || "Bağımsız Kargo";
                const subtitle = item.kind === "quote" ? item.quote.quoteNo : item.record.quoteNo;
                const total =
                  item.kind === "quote" ? shipment.shipmentPrice ?? item.quote.shipping ?? 0 : shipment.shipmentPrice ?? 0;

                return (
                  <div key={item.id} className="rounded-2xl border border-ink-200 bg-white/90 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-ink-900">{title}</p>
                          <span className="rounded-full bg-ink-100 px-2 py-1 text-[11px] font-semibold text-ink-600">
                            {item.kind === "quote" ? "Teklife Bağlı" : "Bağımsız"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">{subtitle}</p>
                      </div>

                      {item.kind === "quote" ? (
                        <button
                          className="rounded-xl bg-ink-900 px-3 py-2 text-xs font-semibold text-white"
                          onClick={() => onOpenQuote(item.quote.id)}
                          type="button"
                        >
                          Teklifi Aç
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-ink-600 md:grid-cols-2">
                      <p>
                        Kargo: {shipment.providerName || "-"} / {shipment.providerServiceCode || "-"}
                      </p>
                      <p>Takip: {shipment.trackingNumber || "-"}</p>
                      <p>Barkod: {shipment.barcode || "-"}</p>
                      <p>Tutar: {total > 0 ? formatCurrency(total) : "-"}</p>
                      <p>Durum: {shipment.status || "-"}</p>
                      <p>Güncelleme: {formatDateTime(getHistoryUpdatedAt(item))}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {!!shipment.barcode && (
                        <button
                          className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink-700 ring-1 ring-inset ring-ink-200"
                          onClick={() => void copyToClipboard(shipment.barcode || "")}
                          type="button"
                        >
                          Barkodu Kopyala
                        </button>
                      )}
                      {!!shipment.trackingNumber && (
                        <button
                          className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink-700 ring-1 ring-inset ring-ink-200"
                          onClick={() => void copyToClipboard(shipment.trackingNumber || "")}
                          type="button"
                        >
                          Takibi Kopyala
                        </button>
                      )}
                      {!!shipment.labelUrl && (
                        <a
                          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                          href={shipment.labelUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Etiketi Aç
                        </a>
                      )}
                      {item.kind === "standalone" && (
                        <button
                          className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-200"
                          onClick={() => void handleDeleteStandaloneShipment(item.record.id)}
                          type="button"
                        >
                          Kaydı Sil
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <aside>
        <SavedQuotesPanel
          currentQuoteId={activeQuote.id}
          quotes={normalizedSavedQuotes}
          onOpen={onOpenQuote}
          onDuplicate={onDuplicateQuote}
          onDelete={onDeleteQuote}
        />
      </aside>
    </div>
  );
}

function createStandaloneDraft(sourceQuote: Quote, companySettings?: CompanySettings | null): Quote {
  const source = sanitizeQuote(sourceQuote);
  const draft = createEmptyQuote();

  return sanitizeQuote({
    ...draft,
    quoteNo: buildStandaloneShipmentNo(),
    customerName: "",
    companyName: companySettings?.companyName || source.companyName || draft.companyName,
    companyLogo: companySettings?.logoUrl || source.companyLogo || draft.companyLogo,
    sellerInfo: companySettings?.sellerInfo || source.sellerInfo || draft.sellerInfo,
    geliverSender: {
      ...draft.geliverSender,
      ...source.geliverSender,
    },
    geliverRecipient: {
      ...draft.geliverRecipient,
    },
    notes: "",
    geliverShipment: null,
  });
}

function preserveStandaloneRecipient(currentDraft: Quote, sourceQuote: Quote, companySettings?: CompanySettings | null): Quote {
  const source = sanitizeQuote(sourceQuote);
  const current = sanitizeQuote(currentDraft);

  return sanitizeQuote({
    ...current,
    companyName: companySettings?.companyName || source.companyName || current.companyName,
    companyLogo: companySettings?.logoUrl || source.companyLogo || current.companyLogo,
    sellerInfo: companySettings?.sellerInfo || source.sellerInfo || current.sellerInfo,
    geliverSender: {
      ...current.geliverSender,
      fullName: current.geliverSender.fullName || source.geliverSender.fullName,
      phone: current.geliverSender.phone || source.geliverSender.phone,
      email: current.geliverSender.email || source.geliverSender.email,
      address1: current.geliverSender.address1 || source.geliverSender.address1,
      cityName: current.geliverSender.cityName || source.geliverSender.cityName,
      cityCode: current.geliverSender.cityCode || source.geliverSender.cityCode,
      districtName: current.geliverSender.districtName || source.geliverSender.districtName,
      districtCode: current.geliverSender.districtCode || source.geliverSender.districtCode,
      neighborhoodName: current.geliverSender.neighborhoodName || source.geliverSender.neighborhoodName,
      zip: current.geliverSender.zip || source.geliverSender.zip,
    },
  });
}

function buildStandaloneShipmentNo() {
  return `KRG-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

function getHistoryUpdatedAt(item: ShippingHistoryItem) {
  return item.kind === "quote" ? item.quote.updatedAt : item.record.updatedAt;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white/90 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
