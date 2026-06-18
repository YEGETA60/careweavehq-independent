import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Upload, FileSpreadsheet, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function splitCsvLine(l: string) {
  const out: string[] = []; let cur = ""; let q = false;
  for (const c of l) { if (c === '"') { q = !q; continue; } if (c === "," && !q) { out.push(cur); cur = ""; continue; } cur += c; }
  out.push(cur); return out.map(s => s.trim());
}
function normTime(t: string) {
  const m = (t || "").match(/(\d{1,2}):(\d{2})/); if (!m) return "";
  let h = parseInt(m[1]); const mm = m[2];
  if (/pm/i.test(t) && h < 12) h += 12;
  if (/am/i.test(t) && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${mm}`;
}
function normDate(d: string) {
  const raw = (d || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dt = new Date(d); return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
}

export function SandataBatchManager() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState({ label: "", period_start: "", period_end: "", program_type: "", payer: "" });
  const [file, setFile] = useState<File | null>(null);

  const refresh = async () => {
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("default_company_id").eq("id", user.id).maybeSingle();
    setCompanyId(prof?.default_company_id ?? null);
    const { data } = await supabase.from("sandata_batches")
      .select("*").order("uploaded_at", { ascending: false }).limit(50);
    setBatches(data ?? []);
  };
  useEffect(() => { refresh(); }, [user?.id]);

  const upload = async () => {
    if (!file) return toast.error("Choose a CSV");
    if (!meta.period_start || !meta.period_end) return toast.error("Period required");
    if (!companyId) return toast.error("Company not loaded");
    setBusy(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error("Empty CSV");
      const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase());
      const find = (...keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
      const di = find("visitdate", "servicedate", "date");
      const si = find("actualstart", "callin", "clockin", "visitstart");
      const ei = find("actualend", "callout", "clockout", "visitend");
      const ni = find("clientname", "recipient", "consumer name");
      const mi = find("medicaid", "memberid", "client id");
      const xi = find("clientexternal", "external id", "agency client id");
      const cgi = find("caregivername", "employee", "worker", "staff");
      const sci = find("servicecode", "procedure", "modifier");
      const pi = find("payer");
      if (di < 0 || si < 0 || ei < 0) throw new Error("CSV must have date / start / end columns");
      const rows = lines.slice(1).map(l => {
        const c = splitCsvLine(l);
        return {
          visit_date: normDate(c[di] ?? ""),
          start_time: normTime(c[si] ?? ""),
          end_time: normTime(c[ei] ?? ""),
          client_name: ni >= 0 ? c[ni] : null,
          medicaid_id: mi >= 0 ? c[mi] : null,
          client_external_id: xi >= 0 ? c[xi] : null,
          caregiver_name: cgi >= 0 ? c[cgi] : null,
          service_code: sci >= 0 ? c[sci] : null,
          payer: pi >= 0 ? c[pi] : meta.payer || null,
          raw: c.reduce((o: any, v, i) => { o[headers[i] ?? `c${i}`] = v; return o; }, {}),
        };
      }).filter(r => r.visit_date && r.start_time && r.end_time);
      if (rows.length === 0) throw new Error("No valid rows parsed");
      const { data, error } = await supabase.functions.invoke("sandata-batch-ingest", {
        body: {
          company_id: companyId,
          label: meta.label || file.name,
          period_start: meta.period_start, period_end: meta.period_end,
          program_type: meta.program_type || null, payer: meta.payer || null,
          filename: file.name, rows,
        },
      });
      if (error) throw error;
      logAudit("create", "sandata_batch", data.batch_id);
      toast.success(`Uploaded ${data.total} rows • ${data.matched} matched, ${data.unmatched} unmatched`);
      setOpen(false); setFile(null); setMeta({ label: "", period_start: "", period_end: "", program_type: "", payer: "" });
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally { setBusy(false); }
  };

  const removeBatch = async (id: string) => {
    if (!confirm("Delete this Sandata batch and all its rows?")) return;
    const { error } = await supabase.from("sandata_batches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    logAudit("delete", "sandata_batch", id);
    refresh();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />Sandata EVV batches</CardTitle>
          <CardDescription>Upload one CSV per pay period / program. Reconciliation auto-picks the right batch per timesheet.</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Upload className="h-4 w-4 mr-1" />Upload batch</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Upload Sandata CSV batch</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Period start</Label><Input type="date" value={meta.period_start} onChange={(e) => setMeta({ ...meta, period_start: e.target.value })} /></div>
                <div><Label>Period end</Label><Input type="date" value={meta.period_end} onChange={(e) => setMeta({ ...meta, period_end: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Program (optional)</Label><Input placeholder="IHSS / CDASS / HCBS…" value={meta.program_type} onChange={(e) => setMeta({ ...meta, program_type: e.target.value })} /></div>
                <div><Label>Payer (optional)</Label><Input placeholder="Medicaid / Medicare / Private" value={meta.payer} onChange={(e) => setMeta({ ...meta, payer: e.target.value })} /></div>
              </div>
              <div><Label>Label (optional)</Label><Input placeholder="e.g. CDASS PP-22" value={meta.label} onChange={(e) => setMeta({ ...meta, label: e.target.value })} /></div>
              <div><Label>CSV file</Label><Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
              <Button onClick={upload} disabled={busy} className="w-full">{busy ? "Uploading…" : "Upload & match clients"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Label</TableHead><TableHead>Period</TableHead><TableHead>Program</TableHead><TableHead>Payer</TableHead><TableHead>Rows</TableHead><TableHead>Uploaded</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {batches.map(b => (
              <TableRow key={b.id}>
                <TableCell className="text-xs">{b.label}</TableCell>
                <TableCell className="text-xs">{b.period_start} → {b.period_end}</TableCell>
                <TableCell className="text-xs"><Badge variant="outline">{b.program_type ?? "—"}</Badge></TableCell>
                <TableCell className="text-xs">{b.payer ?? "—"}</TableCell>
                <TableCell className="text-xs">{b.row_count}</TableCell>
                <TableCell className="text-xs">{new Date(b.uploaded_at).toLocaleString()}</TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => removeBatch(b.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
              </TableRow>
            ))}
            {batches.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No batches uploaded yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
