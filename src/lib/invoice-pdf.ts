import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Invoice, Client, Visit } from "@/contexts/HomeCareCenterContext";
import { supabase } from "@/integrations/supabase/client";
import { applyPhiWatermark } from "@/lib/pdf-watermark";

interface CompanyBrand {
  legal_name?: string;
  display_name?: string | null;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  logo_url?: string | null;
}

let _companyBrand: CompanyBrand | null = null;
let _companyBrandPromise: Promise<CompanyBrand | null> | null = null;

async function loadCompanyBrand(): Promise<CompanyBrand | null> {
  if (_companyBrand) return _companyBrand;
  if (_companyBrandPromise) return _companyBrandPromise;
  _companyBrandPromise = (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: prof } = await (supabase as any).from("profiles").select("default_company_id").eq("id", user.id).maybeSingle();
    if (!prof?.default_company_id) return null;
    const { data: c } = await (supabase as any)
      .from("companies")
      .select("id,legal_name,display_name,email,phone,website,address_line1,address_line2,city,state,postal_code,country,logo_url,timezone")
      .eq("id", prof.default_company_id).maybeSingle();
    // tax_id is column-restricted; fetch via secure RPC (admin/billing only).
    let tax_id: string | null = null;
    try {
      const { data: ident } = await (supabase as any).rpc("get_company_billing_identity", { _company_id: prof.default_company_id });
      if (Array.isArray(ident) && ident[0]) tax_id = ident[0].tax_id ?? null;
    } catch { /* not authorized for tax_id — fine */ }
    _companyBrand = c ? { ...c, tax_id } : null;
    return _companyBrand;
  })();
  return _companyBrandPromise;
}

async function fetchLogoDataUrl(url: string): Promise<{ dataUrl: string; format: string } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const format = blob.type.includes("png") ? "PNG" : blob.type.includes("jpeg") || blob.type.includes("jpg") ? "JPEG" : "PNG";
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return { dataUrl, format };
  } catch { return null; }
}

async function drawCompanyHeader(doc: jsPDF, brand: CompanyBrand | null): Promise<number> {
  if (!brand) return 20;
  let y = 14;
  if (brand.logo_url) {
    const img = await fetchLogoDataUrl(brand.logo_url);
    if (img) {
      try { doc.addImage(img.dataUrl, img.format, 14, y, 30, 18); } catch {}
    }
  }
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(brand.display_name || brand.legal_name || "", 50, y + 6);
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  const addr = [brand.address_line1, brand.address_line2, [brand.city, brand.state, brand.postal_code].filter(Boolean).join(", ")].filter(Boolean);
  let ay = y + 11;
  addr.forEach((l) => { doc.text(String(l), 50, ay); ay += 4; });
  const contact = [brand.phone, brand.email, brand.website].filter(Boolean).join("  ·  ");
  if (contact) { doc.text(contact, 50, ay); ay += 4; }
  if (brand.tax_id) { doc.text(`EIN: ${brand.tax_id}`, 50, ay); ay += 4; }
  const headerBottom = Math.max(34, ay);
  doc.setDrawColor(200);
  doc.line(14, headerBottom, 196, headerBottom);
  return headerBottom + 6;
}

export async function downloadInvoicePdf(invoice: Invoice, client: Client | undefined, visits: Visit[], getHours: (v: Visit) => number) {
  const doc = new jsPDF();
  const brand = await loadCompanyBrand();
  const startY = await drawCompanyHeader(doc, brand);
  doc.setFontSize(20);
  doc.text("INVOICE", 14, startY + 4);
  doc.setFontSize(10);
  doc.text(`Invoice #: ${invoice.id.slice(0, 8).toUpperCase()}`, 14, startY + 14);
  doc.text(`Status: ${invoice.status}`, 14, startY + 20);
  doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 14, startY + 26);

  doc.setFontSize(12);
  doc.text("Bill To:", 14, startY + 40);
  doc.setFontSize(10);
  doc.text(client?.name ?? "Unknown", 14, startY + 46);
  if (client?.address) doc.text(client.address, 14, startY + 52);
  if (client?.phone) doc.text(client.phone, 14, startY + 58);

  const billed = invoice.visits
    .map((id) => visits.find((v) => v.id === id))
    .filter(Boolean) as Visit[];

  autoTable(doc, {
    startY: startY + 68,
    head: [["Date", "Start", "End", "Verified Hours", "Rate", "Amount"]],
    body: billed.map((v) => {
      const h = getHours(v);
      const rate = client?.hourlyRate ?? 0;
      return [
        v.date,
        v.verifiedStartTime || v.startTime,
        v.verifiedEndTime || v.endTime,
        h.toFixed(2),
        `$${rate.toFixed(2)}`,
        `$${(h * rate).toFixed(2)}`,
      ];
    }),
  });

  const finalY = (doc as any).lastAutoTable.finalY || 100;
  doc.setFontSize(12);
  doc.text(`Total Hours: ${invoice.hours.toFixed(2)}`, 14, finalY + 10);
  doc.setFontSize(14);
  doc.text(`Total Due: $${invoice.amount.toFixed(2)}`, 14, finalY + 20);

  applyPhiWatermark(doc, "CONFIDENTIAL — PHI");
  doc.save(`invoice-${invoice.id.slice(0, 8)}.pdf`);
}

export function exportInvoicesCsv(invoices: Invoice[], clients: Client[]) {
  const header = ["Invoice ID", "Client", "Hours", "Amount", "Status", "Due Date", "Visit Count"];
  const rows = invoices.map((i) => [
    i.id,
    clients.find((c) => c.id === i.clientId)?.name ?? "",
    i.hours.toFixed(2),
    i.amount.toFixed(2),
    i.status,
    i.dueDate,
    String(i.visits.length),
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `invoices-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function exportVisitsCsv(visits: Visit[], clients: Client[], getHours: (v: Visit) => number) {
  const header = ["Visit ID", "Client", "Date", "Sched Start", "Sched End", "Verified Start", "Verified End", "Verified Hours", "Status", "Verification"];
  const rows = visits.map((v) => [
    v.id,
    clients.find((c) => c.id === v.clientId)?.name ?? "",
    v.date, v.startTime, v.endTime,
    v.verifiedStartTime ?? "", v.verifiedEndTime ?? "",
    getHours(v).toFixed(2),
    v.status, v.verificationStatus ?? "",
  ]);
  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `visits-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// 837P generation has moved to the dedicated ClaimSubmissions module + the
// `generate-837p` edge function, which produces a full X12N 005010X222A1
// payload from real DB-backed claims, runs SNIP L1–L4 validation, and stores
// an audit trail. The old in-memory stub here was not HIPAA-compliant.