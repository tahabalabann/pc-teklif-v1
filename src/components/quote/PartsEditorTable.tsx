import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import type { QuoteRow } from "../../types/quote";
import { partsCatalog } from "../../data/partsCatalog";
import { DEFAULT_ROW_CATEGORIES, generateId, sanitizeNumber } from "../../utils/quote";
import { formatCurrency, formatInputNumber } from "../../utils/money";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

interface PartsEditorTableProps {
  rows: QuoteRow[];
  onChange: (rows: QuoteRow[]) => void;
}

export function PartsEditorTable({ rows, onChange }: PartsEditorTableProps) {
  const [catalogItemId, setCatalogItemId] = useState(partsCatalog[0]?.id || "");
  const selectedCatalogItem = useMemo(
    () => partsCatalog.find((item) => item.id === catalogItemId) || null,
    [catalogItemId],
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
        category: "Di\u011fer",
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
      },
    ]);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-ink-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">{"Par\u00e7a Listesi"}</h2>
          <p className="mt-1 text-sm text-ink-600">
            {"Tab ile h\u0131zl\u0131 ilerleyin, gerekirse sat\u0131r ekleyin ve s\u0131ra de\u011fi\u015ftirin."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <select className="field min-w-[250px]" value={catalogItemId} onChange={(event) => setCatalogItemId(event.target.value)}>
              {partsCatalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.category} - {item.product}
                </option>
              ))}
            </select>
            <Button onClick={addCatalogItem} type="button" variant="secondary">
              Katalogdan Ekle
            </Button>
            <Button onClick={addRow} type="button" variant="primary">
              {"Sat\u0131r Ekle"}
            </Button>
          </div>
          {selectedCatalogItem && (
            <p className="text-xs text-ink-500">
              {selectedCatalogItem.lastPurchaseNote || formatCurrency(selectedCatalogItem.purchasePrice)} •{" "}
              {selectedCatalogItem.lastSaleNote || formatCurrency(selectedCatalogItem.salePrice)}
            </p>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-ink-500">
          {"Hen\u00fcz par\u00e7a sat\u0131r\u0131 yok. \u0130lk sat\u0131r\u0131 ekleyerek sistemi olu\u015fturmaya ba\u015flay\u0131n."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-[0.16em] text-ink-500">
              <tr>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">{"\u00dcr\u00fcn / Model"}</th>
                <th className="px-4 py-3">{"A\u00e7\u0131klama"}</th>
                <th className="px-4 py-3 text-right">{"Al\u0131\u015f"}</th>
                <th className="px-4 py-3 text-right">{"Sat\u0131\u015f"}</th>
                <th className="px-4 py-3 text-right print:hidden">{"\u0130\u015flem"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-t border-ink-100 align-top">
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
                      placeholder={"\u00d6rn. RTX 3060 Ti"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="field"
                      value={row.description}
                      onChange={(event) => updateRow(row.id, "description", event.target.value)}
                      placeholder={"K\u0131sa test / kondisyon bilgisi"}
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
                        {"Yukar\u0131"}
                      </MiniButton>
                      <MiniButton disabled={index === rows.length - 1} onClick={() => moveRow(row.id, "down")}>
                        {"A\u015fa\u011f\u0131"}
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
