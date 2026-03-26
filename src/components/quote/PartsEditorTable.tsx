import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import type { QuoteRow } from "../../types/quote";
import { partsCatalog, type CatalogPartItem } from "../../data/partsCatalog";
import { DEFAULT_ROW_CATEGORIES, generateId, sanitizeNumber } from "../../utils/quote";
import { productsApi, uploadApi } from "../../utils/api";
import { formatCurrency, formatInputNumber } from "../../utils/money";
import { toast } from "react-hot-toast";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface PartsEditorTableProps {
  rows: QuoteRow[];
  onChange: (rows: QuoteRow[]) => void;
}

export function PartsEditorTable({ rows, onChange }: PartsEditorTableProps) {
  const [dynamicProducts, setDynamicProducts] = useState<CatalogPartItem[]>([]);
  const [uploadingRows, setUploadingRows] = useState<Record<string, boolean>>({});
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("Tum Kategoriler");
  const [catalogBrandFilter, setCatalogBrandFilter] = useState("Tum Markalar");

  useEffect(() => {
    productsApi.list()
      .then((products) => {
        setDynamicProducts(
          products.map((p) => ({
            id: p.id,
            category: p.category,
            product: p.name,
            description: p.description,
            purchasePrice: p.purchasePrice,
            salePrice: p.salePrice,
            brand: "Katalog",
            imageUrl: p.imageUrl,
            stockCount: p.stockCount,
            minStockLevel: p.minStockLevel,
          }))
        );
      })
      .catch(() => {});
  }, []);

  const allCatalogItems = useMemo(
    () => [...partsCatalog, ...dynamicProducts],
    [dynamicProducts]
  );

  const catalogCategories = useMemo(
    () => ["Tum Kategoriler", ...DEFAULT_ROW_CATEGORIES],
    [],
  );
  const catalogBrands = useMemo(
    () => ["Tum Markalar", ...Array.from(new Set(allCatalogItems.map((item) => item.brand || "Belirsiz"))).sort()],
    [allCatalogItems],
  );

  const filteredCatalog = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();

    return allCatalogItems.filter((item) => {
      const categoryMatch = catalogCategoryFilter === "Tum Kategoriler" || item.category === catalogCategoryFilter;
      const brandMatch = catalogBrandFilter === "Tum Markalar" || (item.brand || "Belirsiz") === catalogBrandFilter;
      const searchMatch =
        !query ||
        item.product.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        (item.brand || "").toLowerCase().includes(query);

      return categoryMatch && brandMatch && searchMatch;
    });
  }, [catalogBrandFilter, catalogCategoryFilter, catalogSearch, allCatalogItems]);

  const [catalogItemId, setCatalogItemId] = useState("");

  useEffect(() => {
    if (filteredCatalog.length > 0) {
      const isCurrentValid = filteredCatalog.some(item => item.id === catalogItemId);
      if (!isCurrentValid) {
        setCatalogItemId(filteredCatalog[0].id);
      }
    } else {
      setCatalogItemId("");
    }
  }, [filteredCatalog, catalogItemId]);

  const selectedCatalogItem = useMemo(
    () => filteredCatalog.find((item) => item.id === catalogItemId) || allCatalogItems.find((item) => item.id === catalogItemId) || null,
    [catalogItemId, filteredCatalog, allCatalogItems],
  );

  const updateRow = (id: string, field: keyof QuoteRow, value: string | number) => {
    onChange(
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]:
                field === "purchasePrice" || field === "salePrice" ? sanitizeNumber(value) : value,
            }
          : row,
      ),
    );
  };

  const handleRowImageUpload = async (rowId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5MB'dan küçük olmalıdır.");
      return;
    }

    setUploadingRows((prev) => ({ ...prev, [rowId]: true }));
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const url = await uploadApi.uploadImage(base64, file.name);
          updateRow(rowId, "imageUrl", url);
          toast.success("Fotoğraf eklendi.");
        } catch (error) {
          toast.error("Fotoğraf yüklenemedi.");
        } finally {
          setUploadingRows((prev) => ({ ...prev, [rowId]: false }));
        }
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Dosya okunamadı.");
      setUploadingRows((prev) => ({ ...prev, [rowId]: false }));
    }
  };

  const moveRow = (id: string, direction: "up" | "down") => {
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) {
      return;
    }

    const nextRows = [...rows];
    const [item] = nextRows.splice(index, 1);
    nextRows.splice(targetIndex, 0, item);
    onChange(nextRows);
  };

  const removeRow = (id: string) => onChange(rows.filter((row) => row.id !== id));

  const addRow = () =>
    onChange([
      ...rows,
      {
        id: generateId(),
        category: "Diğer",
        product: "",
        description: "",
        purchasePrice: 0,
        salePrice: 0,
      },
    ]);

  const addCatalogItem = () => {
    if (!selectedCatalogItem) {
      return;
    }

    const firstEmptyRow = rows.find((row) => !row.product && !row.description && row.salePrice <= 0);
    if (firstEmptyRow) {
      onChange(
        rows.map((row) =>
          row.id === firstEmptyRow.id
            ? {
                ...row,
                category: selectedCatalogItem.category,
                product: selectedCatalogItem.product,
                description: selectedCatalogItem.description,
                purchasePrice: selectedCatalogItem.purchasePrice,
                salePrice: selectedCatalogItem.salePrice,
                imageUrl: selectedCatalogItem.imageUrl || row.imageUrl,
                stockCount: selectedCatalogItem.stockCount,
                minStockLevel: selectedCatalogItem.minStockLevel,
              }
            : row,
        ),
      );
      return;
    }

    onChange([
      ...rows,
      {
        id: generateId(),
        category: selectedCatalogItem.category,
        product: selectedCatalogItem.product,
        description: selectedCatalogItem.description,
        purchasePrice: selectedCatalogItem.purchasePrice,
        salePrice: selectedCatalogItem.salePrice,
        imageUrl: selectedCatalogItem.imageUrl,
        stockCount: selectedCatalogItem.stockCount,
        minStockLevel: selectedCatalogItem.minStockLevel,
      },
    ]);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Parca Listesi</h2>
          <p className="mt-1 text-sm text-ink-600">
            Arama ve filtre ile katalogdan hizli secim yapin, sonra satira ekleyin.
          </p>
        </div>

        <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_220px_220px_minmax(320px,1.4fr)_auto_auto]">
          <input
            className="field"
            value={catalogSearch}
            onChange={(event) => setCatalogSearch(event.target.value)}
            placeholder="Katalogda ara"
          />
          <select
            className="field"
            value={catalogCategoryFilter}
            onChange={(event) => setCatalogCategoryFilter(event.target.value)}
          >
            {catalogCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select className="field" value={catalogBrandFilter} onChange={(event) => setCatalogBrandFilter(event.target.value)}>
            {catalogBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
          <select className="field min-w-[250px]" value={catalogItemId} onChange={(event) => setCatalogItemId(event.target.value)}>
            {filteredCatalog.map((item) => {
              const isLowStock = item.stockCount !== undefined && item.stockCount <= (item.minStockLevel || 0);
              return (
                <option key={item.id} value={item.id} className={isLowStock ? 'text-red-500' : ''}>
                  {(item.brand || "Markasız") + " - " + item.category + " - " + item.product} 
                  {item.stockCount !== undefined ? ` (Stok: ${item.stockCount})` : ''}
                </option>
              );
            })}
          </select>
          <Button onClick={addCatalogItem} type="button" variant="secondary">
            Katalogdan Ekle
          </Button>
          <Button onClick={addRow} type="button" variant="primary">
            Satir Ekle
          </Button>
        </div>

        {selectedCatalogItem && (
          <p className="text-xs text-ink-500">
            {(selectedCatalogItem.brand || "Markasiz") + " • "}
            {selectedCatalogItem.lastPurchaseNote || formatCurrency(selectedCatalogItem.purchasePrice)} •{" "}
            {selectedCatalogItem.lastSaleNote || formatCurrency(selectedCatalogItem.salePrice)}
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-ink-500">
          Henuz parca satiri yok. Ilk satiri ekleyerek sistemi olusturmaya baslayin.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-[0.16em] text-ink-500">
              <tr>
                <th className="px-3 py-3 w-16 text-center">Görsel</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Urun / Model</th>
                <th className="px-4 py-3">Aciklama</th>
                <th className="px-4 py-3 text-right">Alis</th>
                <th className="px-4 py-3 text-right">Satis</th>
                <th className="px-4 py-3 text-right print:hidden">Islem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-t border-ink-100 align-top">
                  <td className="px-3 py-3 text-center align-middle relative">
                    {row.stockCount !== undefined && row.stockCount <= (row.minStockLevel || 0) && (
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-r shadow-sm" title="Stok Yetersiz!" />
                    )}
                    {row.imageUrl ? (
                      <div className="relative group mx-auto w-12 h-12">
                        <img src={row.imageUrl} alt="Urun" className="w-12 h-12 object-cover rounded shadow-sm border border-ink-200" />
                        <button
                          type="button"
                          onClick={() => updateRow(row.id, "imageUrl", "")}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-12 h-12 border-2 border-dashed border-ink-200 text-ink-400 rounded cursor-pointer hover:border-brand-400 hover:text-brand-500 transition-colors bg-ink-50 text-xs text-center p-1">
                        {uploadingRows[row.id] ? "..." : "+"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingRows[row.id]}
                          onChange={(e) => handleRowImageUpload(row.id, e)}
                        />
                      </label>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="field"
                      value={row.category}
                      onChange={(event) => updateRow(row.id, "category", event.target.value)}
                    >
                      {DEFAULT_ROW_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="field"
                      value={row.product}
                      onChange={(event) => updateRow(row.id, "product", event.target.value)}
                      placeholder="Orn. RTX 3060 Ti"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="field"
                      value={row.description}
                      onChange={(event) => updateRow(row.id, "description", event.target.value)}
                      placeholder="Kisa test / kondisyon bilgisi"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <PriceInput
                      value={row.purchasePrice}
                      onChange={(event) => updateRow(row.id, "purchasePrice", event.target.value)}
                    />
                    <p className="mt-1 text-right text-xs text-ink-500">{formatCurrency(row.purchasePrice)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <PriceInput
                      value={row.salePrice}
                      onChange={(event) => updateRow(row.id, "salePrice", event.target.value)}
                    />
                    <p className="mt-1 text-right text-xs text-ink-500">{formatCurrency(row.salePrice)}</p>
                  </td>
                  <td className="px-4 py-3 print:hidden">
                    <div className="flex justify-end gap-2">
                      <MiniButton disabled={index === 0} onClick={() => moveRow(row.id, "up")}>
                        Yukari
                      </MiniButton>
                      <MiniButton disabled={index === rows.length - 1} onClick={() => moveRow(row.id, "down")}>
                        Asagi
                      </MiniButton>
                      <MiniButton onClick={() => removeRow(row.id)}>Sil</MiniButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function PriceInput({ value, onChange }: { value: number; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <input
      className="field text-right font-semibold"
      inputMode="decimal"
      value={formatInputNumber(value)}
      onChange={onChange}
      placeholder="0"
    />
  );
}

function MiniButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-lg border border-ink-200 px-2.5 py-2 text-xs font-semibold text-ink-600 transition hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
