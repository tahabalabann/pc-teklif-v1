import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import type { CatalogProduct } from "../../utils/api";
import { productsApi, uploadApi } from "../../utils/api";
import { formatCurrency } from "../../utils/money";
import { DEFAULT_ROW_CATEGORIES } from "../../utils/quote";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Modal } from "../ui/Modal";

const DEFAULT_CATEGORIES = DEFAULT_ROW_CATEGORIES;

export function ProductCatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: "Diğer",
    name: "",
    description: "",
    purchasePrice: "",
    salePrice: "",
    imageUrl: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsApi.list();
      setProducts(data);
    } catch {
      toast.error("Ürünler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      category: DEFAULT_CATEGORIES[0],
      name: "",
      description: "",
      purchasePrice: "",
      salePrice: "",
      imageUrl: "",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (product: CatalogProduct) => {
    setEditingId(product.id);
    setFormData({
      category: product.category || "Diğer",
      name: product.name || "",
      description: product.description || "",
      purchasePrice: String(product.purchasePrice || 0),
      salePrice: String(product.salePrice || 0),
      imageUrl: product.imageUrl || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    try {
      await productsApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Ürün silindi.");
    } catch {
      toast.error("Silme işlemi başarısız.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Ürün adı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<CatalogProduct> = {
        ...(editingId ? { id: editingId } : {}),
        category: formData.category,
        name: formData.name,
        description: formData.description,
        purchasePrice: Number(formData.purchasePrice) || 0,
        salePrice: Number(formData.salePrice) || 0,
        imageUrl: formData.imageUrl,
      };
      const saved = await productsApi.save(payload);
      if (editingId) {
        setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      } else {
        setProducts([saved, ...products]);
      }
      setIsModalOpen(false);
      toast.success(editingId ? "Ürün güncellendi." : "Ürün eklendi.");
    } catch {
      toast.error("Kaydetme işlemi başarısız oldu.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5MB'dan küçük olmalıdır.");
      return;
    }

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const url = await uploadApi.uploadImage(base64, file.name);
          setFormData((prev) => ({ ...prev, imageUrl: url }));
          toast.success("Fotoğraf yüklendi.");
        } catch (error) {
          toast.error("Fotoğraf yüklenemedi.");
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Dosya okunamadı.");
      setUploadingImage(false);
    }
  };

  const filtered = products.filter((p) => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });


  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink-900">Ürün Kataloğu</h2>
            <p className="mt-1 text-sm text-ink-600">
              Sık kullanılan ürünleri kaydedin ve tekliflere kolayca ekleyin.
            </p>
          </div>
          <Button onClick={handleOpenNew} variant="primary">
            + Yeni Ürün Ekle
          </Button>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <input
            className="field flex-1"
            placeholder="Ürün adı veya açıklama ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="field w-full sm:w-48"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Tüm Kategoriler</option>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-ink-50/50 text-ink-500 font-medium">
              <tr>
                <th className="px-6 py-4">KATEGORİ</th>
                <th className="px-6 py-4 w-12 text-center">GÖRSEL</th>
                <th className="px-6 py-4">ÜRÜN / MODEL</th>
                <th className="px-6 py-4 text-right">ALIŞ FİYATI</th>
                <th className="px-6 py-4 text-right">SATIŞ FİYATI</th>
                <th className="px-6 py-4 text-center">İŞLEMLER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-ink-500">
                    Ürünler yükleniyor...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-ink-500">
                    Kayıtlı ürün bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="px-6 py-4 text-ink-600 font-medium">{item.category}</td>
                    <td className="px-6 py-4 text-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-10 w-10 object-cover rounded shadow-sm border border-ink-200 mx-auto" />
                      ) : (
                        <div className="h-10 w-10 bg-ink-100 rounded flex items-center justify-center text-ink-400 mx-auto text-xs">
                          Yok
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-ink-900 font-medium">{item.name}</div>
                      {item.description && <div className="text-ink-500 text-xs mt-1">{item.description}</div>}
                    </td>
                    <td className="px-6 py-4 text-right text-ink-600">{formatCurrency(item.purchasePrice)}</td>
                    <td className="px-6 py-4 text-right text-ink-900 font-semibold">{formatCurrency(item.salePrice)}</td>
                    <td className="px-6 py-4 text-center space-x-2 whitespace-nowrap">
                      <Button onClick={() => handleEdit(item)} variant="secondary" className="px-3 py-1.5 text-xs">
                        Düzenle
                      </Button>
                      <Button onClick={() => void handleDelete(item.id)} variant="danger" className="px-3 py-1.5 text-xs">
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => !saving && setIsModalOpen(false)}>
        <form onSubmit={handleSave} className="p-6">
          <h2 className="text-xl font-semibold mb-6">
            {editingId ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
          </h2>
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Kategori</span>
              <select
                className="field"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {DEFAULT_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Ürün Adı / Model</span>
              <input
                required
                className="field"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: Intel Core i5 13400F"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Açıklama (Opsiyonel)</span>
              <textarea
                className="field min-h-[80px]"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </label>
            <div className="block">
              <span className="mb-2 block text-sm font-medium">Ürün Görseli (Opsiyonel)</span>
              <div className="flex items-center gap-4">
                {formData.imageUrl && (
                  <img src={formData.imageUrl} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-ink-200 shadow-sm" />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    disabled={uploadingImage}
                    className="block w-full text-sm text-ink-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                  />
                  {uploadingImage && <p className="text-xs text-brand-600 mt-1">Yükleniyor...</p>}
                </div>
                {formData.imageUrl && (
                  <button type="button" onClick={() => setFormData(p => ({...p, imageUrl: ""}))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg text-sm font-medium transition-colors">
                    Kaldır
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Alış Fiyatı (TL)</span>
                <input
                  type="number"
                  step="0.01"
                  className="field"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Satış Fiyatı (TL)</span>
                <input
                  type="number"
                  step="0.01"
                  className="field"
                  value={formData.salePrice}
                  onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                />
              </label>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3">
            <Button onClick={() => setIsModalOpen(false)} type="button" variant="ghost" disabled={saving}>
              İptal
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
