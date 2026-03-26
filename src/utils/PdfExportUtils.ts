import jsPDF from "jspdf";
import "jspdf-autotable";
import type { Quote } from "../types/quote";
import { formatCurrency } from "./money";

const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
};

export const exportQuoteToPdf = async (quote: Quote, options?: { showImages?: boolean }) => {
  const showImages = options?.showImages ?? false;
  // Load images
  let quoteImageBase64: string | null = null;
  const rowImagesBase64: Record<string, string> = {};

  if (showImages) {
    if (quote.quoteImage) {
      quoteImageBase64 = await fetchImageAsBase64(quote.quoteImage);
    }
    await Promise.all(
      quote.rows.map(async (row) => {
        if (row.imageUrl) {
          const b64 = await fetchImageAsBase64(row.imageUrl);
          if (b64) rowImagesBase64[row.id] = b64;
        }
      })
    );
  }

  const doc = new jsPDF() as any;

  // Header
  // If we have a quote image, draw it on the right side
  if (quoteImageBase64) {
    // Top right corner image
    doc.addImage(quoteImageBase64, "JPEG", 140, 15, 50, 50, undefined, "FAST");
  }

  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text("TEKLIF FORMU", quoteImageBase64 ? 20 : 105, 20, { align: quoteImageBase64 ? "left" : "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Teklif No: ${quote.id.split('-')[0].toUpperCase()}`, 20, 30);
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 20, 35);
  doc.text(`Müşteri: ${quote.customerName}`, 20, 40);

  // Table
  const tableColumn = showImages ? ["Görsel", "Ürün/Hizmet", "Miktar", "Birim Fiyat", "Toplam"] : ["Ürün/Hizmet", "Miktar", "Birim Fiyat", "Toplam"];
  const tableRows = quote.rows.map((row) => {
    const baseRow = [
      row.product,
      1, // Default quantity to 1 if not present in Row (QuoteRow doesn't have quantity, wait...)
      formatCurrency(row.salePrice),
      formatCurrency(row.salePrice)
    ];
    if (showImages) {
      return ["", ...baseRow];
    }
    return baseRow;
  });

  doc.autoTable({
    startY: quoteImageBase64 ? 60 : 50,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }, // brand-500
    styles: { fontSize: 9, minCellHeight: showImages ? 15 : 10, valign: "middle" },
    columnStyles: showImages
      ? { 0: { cellWidth: 15, halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
      : { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    didDrawCell: (data: any) => {
      if (showImages && data.section === 'body' && data.column.index === 0) {
        const rowIndex = data.row.index;
        const rowData = quote.rows[rowIndex];
        if (rowData && rowImagesBase64[rowData.id]) {
          const dim = data.cell.height - 4;
          // Center the image if width > dim
          const xOffset = data.cell.x + (data.cell.width - dim) / 2;
          doc.addImage(rowImagesBase64[rowData.id], "JPEG", xOffset, data.cell.y + 2, dim, dim, undefined, "FAST");
        }
      }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || (quoteImageBase64 ? 70 : 150);

  // Footer / Totals
  doc.setFontSize(11);
  doc.setTextColor(40);
  const totalLabel = "GENEL TOPLAM:";
  const totalValue = formatCurrency(quote.salesPrice);
  doc.text(totalLabel, 150, finalY + 15, { align: "right" });
  doc.text(totalValue, 190, finalY + 15, { align: "right" });

  if (quote.notes) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Notlar:", 20, finalY + 30);
    doc.text(quote.notes, 20, finalY + 35, { maxWidth: 170 });
  }

  doc.save(`Teklif_${quote.customerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};
