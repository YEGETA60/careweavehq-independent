import type jsPDF from "jspdf";

/**
 * Applies a HIPAA-compliant diagonal watermark to every page of a jsPDF doc.
 * Use for any PDF that may contain PHI (timesheets, invoices, audit packets).
 */
export function applyPhiWatermark(doc: jsPDF, label = "CONFIDENTIAL — PHI") {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    // @ts-ignore - jsPDF supports GState in newer versions
    if (typeof (doc as any).setGState === "function" && typeof (doc as any).GState === "function") {
      try { (doc as any).setGState(new (doc as any).GState({ opacity: 0.08 })); } catch { /* noop */ }
    }
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(56);
    doc.text(label, w / 2, h / 2, { align: "center", angle: 35 } as any);
    doc.setFontSize(8);
    const stamp = `Printed ${new Date().toLocaleString()} · Page ${i}/${pages}`;
    doc.text(stamp, w / 2, h - 6, { align: "center" });
    // reset
    if (typeof (doc as any).setGState === "function" && typeof (doc as any).GState === "function") {
      try { (doc as any).setGState(new (doc as any).GState({ opacity: 1 })); } catch { /* noop */ }
    }
    doc.setTextColor(0, 0, 0);
  }
}