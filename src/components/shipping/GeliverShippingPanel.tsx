import { useEffect, useMemo, useState } from "react";
import type { GeliverProviderService, LocationOption, Quote, SavedRecipientAddress } from "../../types/quote";
import { addressBookApi, geliverApi, senderAddressBookApi } from "../../utils/api";
import { formatCurrency } from "../../utils/money";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface GeliverShippingPanelProps {
  quote: Quote;
  onChange: (patch: Partial<Quote>) => void;
  mode?: "quote" | "standalone";
  onShipmentCreated?: (shipment: ShipmentResponse, quoteSnapshot: Quote) => void;
}

interface ShipmentResponse {
  transactionId: string;
  shipmentId: string;
  trackingNumber: string;
  barcode: string;
  labelUrl: string;
  providerName: string;
  providerServiceCode: string;
  agreementCode: string;
  agreementText: string;
  status: string;
  createdAt: string;
  shipmentPrice?: number;
}

function safeJsonParse(text: string) {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as { shipment?: ShipmentResponse; error?: string; message?: string };
  } catch {
    return { message: text };
  }
}

export function GeliverShippingPanel({
  quote,
  onChange,
  mode = "quote",
  onShipmentCreated,
}: GeliverShippingPanelProps) {
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [services, setServices] = useState<GeliverProviderService[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);
  const [senderDistricts, setSenderDistricts] = useState<LocationOption[]>([]);
  const [senderNeighborhoods, setSenderNeighborhoods] = useState<LocationOption[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedRecipientAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [savedSenderAddresses, setSavedSenderAddresses] = useState<SavedRecipientAddress[]>([]);
  const [selectedSenderAddressId, setSelectedSenderAddressId] = useState("");
  const [savingSenderAddress, setSavingSenderAddress] = useState(false);
  const [defaultSenderAddress, setDefaultSenderAddress] = useState<Quote["geliverSender"] | null>(null);

  const selectedService = useMemo(
    () => services.find((service) => service.code === quote.geliverProviderServiceCode) || null,
    [quote.geliverProviderServiceCode, services],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [nextServices, nextCities, nextSavedAddresses, nextSavedSenderAddresses, nextDefaultSender] =
          await Promise.all([
            geliverApi.listProviderServices(),
            geliverApi.listCities(),
            addressBookApi.list(),
            senderAddressBookApi.list(),
            geliverApi.getDefaultSender(),
          ]);

        if (cancelled) {
          return;
        }

        setServices(nextServices);
        setCities(nextCities);
        setSavedAddresses(nextSavedAddresses);
        setSavedSenderAddresses(nextSavedSenderAddresses);
        setDefaultSenderAddress(nextDefaultSender);
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Geliver verileri yüklenemedi.");
        }
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!quote.geliverRecipient.cityCode) {
      setDistricts([]);
      setNeighborhoods([]);
      return;
    }

    let cancelled = false;

    void geliverApi
      .listDistricts(quote.geliverRecipient.cityCode)
      .then((items) => {
        if (!cancelled) {
          setDistricts(items);
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "İlçeler yüklenemedi.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [quote.geliverRecipient.cityCode]);

  useEffect(() => {
    if (!quote.geliverSender.cityCode) {
      setSenderDistricts([]);
      setSenderNeighborhoods([]);
      return;
    }

    let cancelled = false;

    void geliverApi
      .listDistricts(quote.geliverSender.cityCode)
      .then((items) => {
        if (!cancelled) {
          setSenderDistricts(items);
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Gönderici ilçeleri yüklenemedi.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [quote.geliverSender.cityCode]);

  useEffect(() => {
    if (!quote.geliverRecipient.cityCode || !quote.geliverRecipient.districtCode) {
      setNeighborhoods([]);
      return;
    }

    let cancelled = false;

    void geliverApi
      .listNeighborhoods(quote.geliverRecipient.cityCode, quote.geliverRecipient.districtCode)
      .then((items) => {
        if (!cancelled) {
          setNeighborhoods(items);
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Mahalleler yüklenemedi.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [quote.geliverRecipient.cityCode, quote.geliverRecipient.districtCode]);

  useEffect(() => {
    if (!quote.geliverSender.cityCode || !quote.geliverSender.districtCode) {
      setSenderNeighborhoods([]);
      return;
    }

    let cancelled = false;

    void geliverApi
      .listNeighborhoods(quote.geliverSender.cityCode, quote.geliverSender.districtCode)
      .then((items) => {
        if (!cancelled) {
          setSenderNeighborhoods(items);
        }
      })
      .catch((caughtError) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Gönderici mahalleleri yüklenemedi.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [quote.geliverSender.cityCode, quote.geliverSender.districtCode]);

  const updateRecipient = (patch: Partial<Quote["geliverRecipient"]>) => {
    onChange({
      geliverRecipient: {
        ...quote.geliverRecipient,
        ...patch,
      },
    });
  };

  const updateSender = (patch: Partial<Quote["geliverSender"]>) => {
    onChange({
      geliverSender: {
        ...quote.geliverSender,
        ...patch,
      },
    });
  };

  const updateParcel = (field: keyof Quote["geliverParcel"], value: string) => {
    onChange({
      geliverParcel: {
        ...quote.geliverParcel,
        [field]: Number(value) || 0,
      },
    });
  };

  const handleCityChange = (cityCode: string) => {
    const city = cities.find((item) => item.code === cityCode);
    updateRecipient({
      cityCode,
      cityName: city?.name || "",
      districtCode: "",
      districtName: "",
      neighborhoodName: "",
    });
  };

  const handleDistrictChange = (districtCode: string) => {
    const district = districts.find((item) => item.code === districtCode);
    updateRecipient({
      districtCode,
      districtName: district?.name || "",
      neighborhoodName: "",
    });
  };

  const handleSenderCityChange = (cityCode: string) => {
    const city = cities.find((item) => item.code === cityCode);
    updateSender({
      cityCode,
      cityName: city?.name || "",
      districtCode: "",
      districtName: "",
      neighborhoodName: "",
    });
  };

  const handleSenderDistrictChange = (districtCode: string) => {
    const district = senderDistricts.find((item) => item.code === districtCode);
    updateSender({
      districtCode,
      districtName: district?.name || "",
      neighborhoodName: "",
    });
  };

  const createShipment = async () => {
    setLoading(true);
    setError("");

    try {
      const token = window.localStorage.getItem("pc-teklif:sessionToken") || "";
      const response = await fetch("/api/geliver/create-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quote }),
      });

      const payload = safeJsonParse(await response.text());

      if (!response.ok || !payload.shipment) {
        throw new Error(payload.error || payload.message || "Geliver gönderisi oluşturulamadı.");
      }

      const nextQuote = {
        ...quote,
        geliverShipment: payload.shipment,
        shipping: payload.shipment.shipmentPrice ?? quote.shipping,
      };

      onChange({
        geliverShipment: payload.shipment,
        shipping: payload.shipment.shipmentPrice ?? quote.shipping,
      });
      onShipmentCreated?.(payload.shipment, nextQuote);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentAddress = async () => {
    setSavingAddress(true);
    setError("");

    try {
      const label =
        quote.geliverRecipient.addressName.trim() ||
        quote.customerName.trim() ||
        quote.geliverRecipient.fullName.trim() ||
        "Kayıtlı Adres";

      const savedAddress = await addressBookApi.save({
        label,
        recipient: quote.geliverRecipient,
      });

      setSavedAddresses((prev) => {
        const exists = prev.some((item) => item.id === savedAddress.id);
        return exists ? prev.map((item) => (item.id === savedAddress.id ? savedAddress : item)) : [savedAddress, ...prev];
      });
      setSelectedAddressId(savedAddress.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Adres kaydedilemedi.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleApplySavedAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    const selected = savedAddresses.find((item) => item.id === addressId);
    if (!selected) {
      return;
    }

    onChange({
      geliverRecipient: {
        ...quote.geliverRecipient,
        ...selected.recipient,
      },
    });
  };

  const deleteSelectedAddress = async () => {
    if (!selectedAddressId) {
      return;
    }

    try {
      await addressBookApi.delete(selectedAddressId);
      setSavedAddresses((prev) => prev.filter((item) => item.id !== selectedAddressId));
      setSelectedAddressId("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Adres silinemedi.");
    }
  };

  const saveCurrentSenderAddress = async () => {
    setSavingSenderAddress(true);
    setError("");

    try {
      const label =
        quote.geliverSender.addressName.trim() ||
        quote.geliverSender.fullName.trim() ||
        quote.companyName.trim() ||
        "Kayıtlı Gönderici";

      const savedAddress = await senderAddressBookApi.save({
        label,
        recipient: quote.geliverSender,
      });

      setSavedSenderAddresses((prev) => {
        const exists = prev.some((item) => item.id === savedAddress.id);
        return exists ? prev.map((item) => (item.id === savedAddress.id ? savedAddress : item)) : [savedAddress, ...prev];
      });
      setSelectedSenderAddressId(savedAddress.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Gönderici adresi kaydedilemedi.");
    } finally {
      setSavingSenderAddress(false);
    }
  };

  const handleApplySavedSenderAddress = (addressId: string) => {
    setSelectedSenderAddressId(addressId);
    const selected = savedSenderAddresses.find((item) => item.id === addressId);
    if (!selected) {
      return;
    }

    onChange({
      geliverSender: {
        ...quote.geliverSender,
        ...selected.recipient,
      },
    });
  };

  const deleteSelectedSenderAddress = async () => {
    if (!selectedSenderAddressId) {
      return;
    }

    try {
      await senderAddressBookApi.delete(selectedSenderAddressId);
      setSavedSenderAddresses((prev) => prev.filter((item) => item.id !== selectedSenderAddressId));
      setSelectedSenderAddressId("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Gönderici adresi silinemedi.");
    }
  };

  const applyDefaultSenderAddress = () => {
    if (!defaultSenderAddress) {
      return;
    }

    onChange({
      geliverSender: {
        ...quote.geliverSender,
        ...defaultSenderAddress,
      },
    });
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Geliver Kargo</h2>
          <p className="mt-1 text-sm text-ink-600">
            Tüm desteklenen kargo servislerini listeleyin, adresi seçimli doldurun ve gönderi oluşturun.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select className="field min-w-[260px]" value={selectedAddressId} onChange={(event) => handleApplySavedAddress(event.target.value)}>
              <option value="">Kayıtlı müşteri adresi seçin</option>
              {savedAddresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label} - {address.recipient.fullName || address.recipient.cityName}
                </option>
              ))}
            </select>
            <Button onClick={() => void saveCurrentAddress()} type="button" disabled={savingAddress}>
              {savingAddress ? "Kaydediliyor..." : "Adresi Kaydet"}
            </Button>
            <Button onClick={() => void deleteSelectedAddress()} type="button" disabled={!selectedAddressId}>
              Adresi Sil
            </Button>
          </div>
        </div>
        <Button onClick={createShipment} type="button" variant="primary" disabled={loading || booting}>
          {loading ? "Oluşturuluyor..." : mode === "standalone" ? "Bağımsız Kargo Oluştur" : "Geliver Gönderisi Oluştur"}
        </Button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 lg:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-500">Gönderici Bilgileri</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select className="field min-w-[260px]" value={selectedSenderAddressId} onChange={(event) => handleApplySavedSenderAddress(event.target.value)}>
              <option value="">Kayıtlı gönderici adresi seçin</option>
              {savedSenderAddresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label} - {address.recipient.fullName || address.recipient.cityName}
                </option>
              ))}
            </select>
            <Button onClick={() => void saveCurrentSenderAddress()} type="button" disabled={savingSenderAddress}>
              {savingSenderAddress ? "Kaydediliyor..." : "Göndericiyi Kaydet"}
            </Button>
            <Button onClick={() => void deleteSelectedSenderAddress()} type="button" disabled={!selectedSenderAddressId}>
              Göndericiyi Sil
            </Button>
            <Button onClick={applyDefaultSenderAddress} type="button" disabled={!defaultSenderAddress}>
              Varsayılanı Doldur
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <input className="field" placeholder="Gönderici adres adı" value={quote.geliverSender.addressName} onChange={(event) => updateSender({ addressName: event.target.value })} />
            <input className="field" placeholder="Gönderici adı" value={quote.geliverSender.fullName} onChange={(event) => updateSender({ fullName: event.target.value })} />
            <input className="field" placeholder="Telefon" value={quote.geliverSender.phone} onChange={(event) => updateSender({ phone: event.target.value })} />
            <input className="field" placeholder="E-posta" value={quote.geliverSender.email} onChange={(event) => updateSender({ email: event.target.value })} />
            <select className="field" value={quote.geliverSender.cityCode} onChange={(event) => handleSenderCityChange(event.target.value)}>
              <option value="">İl Seçin</option>
              {cities.map((city) => (
                <option key={`sender-${city.code}`} value={city.code}>
                  {city.name}
                </option>
              ))}
            </select>
            <select className="field" value={quote.geliverSender.districtCode} onChange={(event) => handleSenderDistrictChange(event.target.value)} disabled={!quote.geliverSender.cityCode}>
              <option value="">İlçe Seçin</option>
              {senderDistricts.map((district) => (
                <option key={`sender-${district.code}`} value={district.code}>
                  {district.name}
                </option>
              ))}
            </select>
            <select className="field" value={quote.geliverSender.neighborhoodName} onChange={(event) => updateSender({ neighborhoodName: event.target.value })} disabled={!quote.geliverSender.districtCode}>
              <option value="">Mahalle Seçin</option>
              {senderNeighborhoods.map((neighborhood) => (
                <option key={`sender-${neighborhood.code || neighborhood.name}`} value={neighborhood.name}>
                  {neighborhood.name}
                </option>
              ))}
            </select>
            <input className="field" placeholder="Posta Kodu" value={quote.geliverSender.zip} onChange={(event) => updateSender({ zip: event.target.value })} />
            <input className="field xl:col-span-4" placeholder="Gönderici adres satırı" value={quote.geliverSender.address1} onChange={(event) => updateSender({ address1: event.target.value })} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-500">Alıcı Bilgileri</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" placeholder="Adres adı (Ev, Ofis, Depo)" value={quote.geliverRecipient.addressName} onChange={(event) => updateRecipient({ addressName: event.target.value })} />
            <input className="field" placeholder="Alıcı adı" value={quote.geliverRecipient.fullName} onChange={(event) => updateRecipient({ fullName: event.target.value })} />
            <input className="field" placeholder="Telefon" value={quote.geliverRecipient.phone} onChange={(event) => updateRecipient({ phone: event.target.value })} />
            <input className="field sm:col-span-2" placeholder="E-posta" value={quote.geliverRecipient.email} onChange={(event) => updateRecipient({ email: event.target.value })} />
            <select className="field" value={quote.geliverRecipient.cityCode} onChange={(event) => handleCityChange(event.target.value)}>
              <option value="">İl Seçin</option>
              {cities.map((city) => (
                <option key={city.code} value={city.code}>
                  {city.name}
                </option>
              ))}
            </select>
            <select className="field" value={quote.geliverRecipient.districtCode} onChange={(event) => handleDistrictChange(event.target.value)} disabled={!quote.geliverRecipient.cityCode}>
              <option value="">İlçe Seçin</option>
              {districts.map((district) => (
                <option key={district.code} value={district.code}>
                  {district.name}
                </option>
              ))}
            </select>
            <select className="field sm:col-span-2" value={quote.geliverRecipient.neighborhoodName} onChange={(event) => updateRecipient({ neighborhoodName: event.target.value })} disabled={!quote.geliverRecipient.districtCode}>
              <option value="">Mahalle Seçin</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.code || neighborhood.name} value={neighborhood.name}>
                  {neighborhood.name}
                </option>
              ))}
            </select>
            <input className="field sm:col-span-2" placeholder="Adres satırı" value={quote.geliverRecipient.address1} onChange={(event) => updateRecipient({ address1: event.target.value })} />
            <input className="field" placeholder="Posta Kodu" value={quote.geliverRecipient.zip} onChange={(event) => updateRecipient({ zip: event.target.value })} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-500">Servis ve Paket Bilgileri</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="field sm:col-span-2" value={quote.geliverProviderServiceCode} onChange={(event) => onChange({ geliverProviderServiceCode: event.target.value })}>
              <option value="">Kargo Servisi Seçin</option>
              {services.map((service) => (
                <option key={service.code} value={service.code}>
                  {service.providerName} - {service.name}
                </option>
              ))}
            </select>
            <input className="field" placeholder="Uzunluk (cm)" value={quote.geliverParcel.length || ""} onChange={(event) => updateParcel("length", event.target.value)} />
            <input className="field" placeholder="Genişlik (cm)" value={quote.geliverParcel.width || ""} onChange={(event) => updateParcel("width", event.target.value)} />
            <input className="field" placeholder="Yükseklik (cm)" value={quote.geliverParcel.height || ""} onChange={(event) => updateParcel("height", event.target.value)} />
            <input className="field" placeholder="Ağırlık (kg)" value={quote.geliverParcel.weight || ""} onChange={(event) => updateParcel("weight", event.target.value)} />
            <input className="field sm:col-span-2" placeholder="Source Identifier" value={quote.geliverSourceIdentifier} onChange={(event) => onChange({ geliverSourceIdentifier: event.target.value })} />
          </div>

          {selectedService && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-ink-700">
              <p className="font-semibold text-ink-900">
                {selectedService.providerName} / {selectedService.name}
              </p>
              {selectedService.description && <p className="mt-1">{selectedService.description}</p>}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {quote.geliverShipment && (
        <div className="mt-5 grid gap-3 rounded-2xl border border-ink-200 bg-ink-50/70 p-4 sm:grid-cols-2">
          <Info label="Kargo Firması" value={`${quote.geliverShipment.providerName} / ${quote.geliverShipment.providerServiceCode}`} />
          <Info label="Takip No" value={quote.geliverShipment.trackingNumber || "-"} />
          <Info label="Barkod" value={quote.geliverShipment.barcode || "-"} />
          <Info label="Anlaşma Kodu" value={quote.geliverShipment.agreementCode || "-"} />
          <Info label="Anlaşma Metni" value={quote.geliverShipment.agreementText || "-"} />
          <Info label="Durum" value={quote.geliverShipment.status || "-"} />
          <Info
            label="Kargo Tutarı"
            value={(quote.geliverShipment.shipmentPrice ?? quote.shipping) > 0 ? formatCurrency(quote.geliverShipment.shipmentPrice ?? quote.shipping) : "-"}
          />
          {quote.geliverShipment.labelUrl && (
            <a
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 sm:col-span-2"
              href={quote.geliverShipment.labelUrl}
              rel="noreferrer"
              target="_blank"
            >
              Etiketi Aç
            </a>
          )}
        </div>
      )}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
