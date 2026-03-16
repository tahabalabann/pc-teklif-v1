import { useEffect, useMemo, useState } from "react";
import type { CompanyRecord, Quote } from "../../types/quote";
import { companiesApi } from "../../utils/api";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface CompanyManagementPanelProps {
  quote: Quote;
  onApplyCompany: (company: CompanyRecord) => void;
}

const categories = ["Tümü", "Kurumsal", "Bireysel", "Tedarikçi", "Servis", "Diğer"] as const;

const emptyCompany = (): CompanyRecord => ({
  id: "",
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  taxOffice: "",
  taxNumber: "",
  address: "",
  notes: "",
  category: "Kurumsal",
  tags: "",
  createdAt: "",
  updatedAt: "",
});

export function TeamManagementPanel({ quote, onApplyCompany }: CompanyManagementPanelProps) {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [form, setForm] = useState<CompanyRecord>(emptyCompany());
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categories)[number]>("Tümü");

  const loadCompanies = async () => {
    try {
      setCompanies(await companiesApi.list());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Firma kayıtları alınamadı.");
    }
  };

  useEffect(() => {
    void loadCompanies();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      const saved = await companiesApi.save(form);
      setCompanies((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        return exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev];
      });
      setForm(emptyCompany());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Firma kaydedilemedi.");
    }
  };

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch = [
        company.companyName,
        company.contactName,
        company.phone,
        company.email,
        company.taxNumber,
        company.tags,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(search.toLocaleLowerCase("tr-TR"));
      const matchesCategory = categoryFilter === "Tümü" || (company.category || "Diğer") === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, companies, search]);

  return (
    <Card className="p-5 print:hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Firma ve Müşteri Kayıtları</h2>
          <p className="mt-1 text-sm text-ink-600">
            Farklı firmaları, yetkili kişileri, vergi-adres bilgilerini ve etiketleri kaydedin. İsterseniz tek tıkla
            aktif teklife uygulayın.
          </p>
        </div>
      </div>

      <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <input className="field" placeholder="Firma adı" value={form.companyName} onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))} />
        <input className="field" placeholder="Yetkili kişi" value={form.contactName} onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))} />
        <select className="field" value={form.category || "Kurumsal"} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}>
          {categories.filter((item) => item !== "Tümü").map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input className="field" placeholder="Etiketler (oyuncu, toplu, cari)" value={form.tags || ""} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} />
        <input className="field" placeholder="Telefon" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
        <input className="field" placeholder="E-posta" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
        <input className="field" placeholder="Vergi dairesi" value={form.taxOffice} onChange={(event) => setForm((prev) => ({ ...prev, taxOffice: event.target.value }))} />
        <input className="field" placeholder="Vergi no / TCKN" value={form.taxNumber} onChange={(event) => setForm((prev) => ({ ...prev, taxNumber: event.target.value }))} />
        <textarea className="field min-h-[96px] md:col-span-2" placeholder="Adres" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
        <textarea className="field min-h-[96px] md:col-span-2" placeholder="Notlar" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        <Button className="md:col-span-2" type="submit" variant="primary">
          Firma Kaydet
        </Button>
      </form>

      {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <input className="field" placeholder="Firma ara" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="field" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as (typeof categories)[number])}>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 space-y-3">
        {filteredCompanies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500">
            Henüz firma kaydı yok.
          </div>
        ) : (
          filteredCompanies.map((company) => (
            <div key={company.id} className="rounded-2xl border border-ink-200 bg-ink-50/70 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{company.companyName}</p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-600 ring-1 ring-ink-200">
                      {company.category || "Diğer"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-600">
                    {company.contactName || "Yetkili girilmedi"}
                    {company.phone ? ` • ${company.phone}` : ""}
                    {company.email ? ` • ${company.email}` : ""}
                  </p>
                  {(company.taxOffice || company.taxNumber) && (
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-500">
                      {company.taxOffice || "-"} / {company.taxNumber || "-"}
                    </p>
                  )}
                  {company.tags && <p className="mt-2 text-xs text-brand-700">Etiketler: {company.tags}</p>}
                  {company.address && <p className="mt-2 whitespace-pre-line text-sm text-ink-700">{company.address}</p>}
                  {company.notes && <p className="mt-2 whitespace-pre-line text-sm text-ink-500">{company.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={() => setForm(company)}>
                    Düzenle
                  </Button>
                  <Button type="button" onClick={() => onApplyCompany(company)}>
                    Teklife Uygula
                  </Button>
                  <Button type="button" onClick={() => void companiesApi.delete(company.id).then(loadCompanies)}>
                    Sil
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {(quote.customerName || quote.companyName) && (
        <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-ink-700">
          Aktif teklif: <strong>{quote.customerName || "-"}</strong> / <strong>{quote.companyName || "-"}</strong>
        </div>
      )}
    </Card>
  );
}
