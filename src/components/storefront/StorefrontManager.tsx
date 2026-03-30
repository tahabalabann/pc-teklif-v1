import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, PencilIcon } from "@heroicons/react/24/outline";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import type { FrontendFeaturedSystem } from "../../types/storefront";
import toast from "react-hot-toast";

import { storefrontApi } from "../../utils/api";

export function StorefrontManager() {
  const [systems, setSystems] = useState<FrontendFeaturedSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    badge: "",
    specsText: "" // Comma separated
  });

  const loadSystems = async () => {
    try {
      setLoading(true);
      const data = await storefrontApi.list();
      const parsedSystems = data.map((s: any) => ({
        ...s,
        specs: typeof s.specs === 'string' ? JSON.parse(s.specs || "[]") : s.specs
      }));
      setSystems(parsedSystems);
    } catch (err: any) {
      toast.error(err.message || "Vitrin sistemleri yüklenemedi.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSystems();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.specsText) {
      return toast.error("Lütfen ad, fiyat ve özellik alanlarını doldurun.");
    }

    try {
      const specsArray = formData.specsText.split(",").map(s => s.trim()).filter(Boolean);
      const payload = {
        name: formData.name,
        category: formData.category,
        price: formData.price,
        badge: formData.badge || null,
        specs: specsArray
      };

      if (editingId) {
        await storefrontApi.update(editingId, payload as any);
      } else {
        await storefrontApi.create(payload as any);
      }

      toast.success("Sistem vitrine başarıyla kaydedildi.");
      setFormData({ name: "", category: "", price: "", badge: "", specsText: "" });
      setEditingId(null);
      await loadSystems();
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu.");
      console.error("Save error:", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} isimli sistemi vitrinden silmek istediğinize emin misiniz?`)) return;
    
    try {
      await storefrontApi.delete(id);
      toast.success("Sistem silindi.");
      await loadSystems();
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu.");
      console.error(err);
    }
  };

  const handleEdit = (system: FrontendFeaturedSystem) => {
    setEditingId(system.id);
    setFormData({
      name: system.name,
      category: system.category,
      price: system.price,
      badge: system.badge || "",
      specsText: system.specs.join(", ")
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ name: "", category: "", price: "", badge: "", specsText: "" });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Ana Sayfa Vitrin Yönetimi</h2>
          <p className="mt-1 text-sm text-ink-600">
            Ana sayfada sergilenen Hazır Sistemleri buradan ekleyebilir veya düzenleyebilirsiniz. Değişiklikler anında canlı siteye yansır.
          </p>
        </div>

        <form onSubmit={handleSave} className="mt-6 border-t border-ink-100 pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="md:col-span-2 lg:col-span-1">
              <label className="mb-2 block text-sm font-medium text-ink-900">Sistem Adı *</label>
              <input
                type="text"
                className="field"
                placeholder="Örn: Alpha Plus"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-900">Kategori / Tip</label>
              <input
                type="text"
                className="field"
                placeholder="Örn: 1080p Oyun"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-900">Fiyat *</label>
              <input
                type="text"
                className="field"
                placeholder="Örn: 25.999"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink-900">Etiket (Badge)</label>
              <input
                type="text"
                className="field"
                placeholder="Örn: Çok Satan"
                value={formData.badge}
                onChange={e => setFormData({ ...formData, badge: e.target.value })}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-ink-900">Donanım Özellikleri (Virgülle ayırın) *</label>
            <input
              type="text"
              className="field"
              placeholder="Örn: AMD Ryzen 5 5600, RTX 4060 8GB, 16GB 3200MHz, 512GB M.2 NVMe"
              value={formData.specsText}
              onChange={e => setFormData({ ...formData, specsText: e.target.value })}
              required
            />
          </div>

          <div className="mt-4 flex gap-3">
            <Button type="submit" variant="primary">
              <PlusIcon className="mr-2 h-4 w-4" />
              {editingId ? "Güncelle" : "Vitrine Ekle"}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={handleCancel}>
                İptal Et
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
           <div className="p-8 text-center text-sm text-ink-500">Yükleniyor...</div>
        ) : systems.length === 0 ? (
           <div className="p-8 text-center text-sm text-ink-500">Henüz vitrine sistem eklenmemiş.</div>
        ) : (
          <table className="w-full text-left text-sm text-ink-600">
            <thead className="border-b border-ink-100 bg-ink-50/50 text-xs uppercase text-ink-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Sistem Adı</th>
                <th className="px-6 py-4 font-semibold">Fiyat</th>
                <th className="px-6 py-4 font-semibold hidden md:table-cell">Özellikler</th>
                <th className="px-6 py-4 font-semibold text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {systems.map((system) => (
                <tr key={system.id} className="hover:bg-ink-50/30">
                  <td className="px-6 py-4 font-medium text-ink-900">
                    {system.name}
                    {system.badge && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700">{system.badge}</span>}
                  </td>
                  <td className="px-6 py-4">{system.price} ₺</td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                       {system.specs.map((sp, idx) => (
                         <span key={idx} className="bg-ink-100 text-ink-600 px-2 py-0.5 rounded text-xs">{sp}</span>
                       ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" className="!p-2 text-ink-500" onClick={() => handleEdit(system)}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" className="!p-2 text-red-500" onClick={() => handleDelete(system.id, system.name)}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
