import jsPDF from "jspdf";
import "jspdf-autotable";
import type { Quote } from "../types/quote";
import { formatCurrency } from "./money";

export const exportQuoteToPdf = (quote: Quote) => {
  const doc = new jsPDF() as any;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text("TEKLIF FORMU", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Teklif No: ${quote.id.split('-')[0].toUpperCase()}`, 20, 30);
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 20, 35);
  doc.text(`Müşteri: ${quote.customerName}`, 20, 40);

  // Table
  const tableColumn = ["Ürün/Hizmet", "Miktar", "Birim Fiyat", "Toplam"];
  const tableRows = quote.rows.map((row) => [
    row.product,
    1, // Default quantity to 1 if not present in Row (QuoteRow doesn't have quantity, wait...)
    formatCurrency(row.salePrice),
    formatCurrency(row.salePrice)
  ]);

  doc.autoTable({
    startY: 50,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }, // brand-500
    styles: { fontSize: 9 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;

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
