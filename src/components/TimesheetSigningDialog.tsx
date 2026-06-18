import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignaturePad } from "@/components/SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { Lock, ShieldCheck, AlertTriangle, FileSpreadsheet, Bell, Wand2, CheckCircle2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Role = "caregiver" | "client" | "supervisor";
const ROLE_LABEL: Record<Role, string> = {
  caregiver: "Caregiver",
  client: "Client / Representative",
  supervisor: "Supervisor",
};

interface Props {
  timesheetId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSigned?: () => void;
}

export function TimesheetSigningDialog({ timesheetId, open, onOpenChange, onSigned }: Props) {
  const { user } = useAuth();
  const [ts, setTs] = useState<any>(null);
  const [sigs, setSigs] = useState<any[]>([]);
  const [recon, setRecon] = useState<any[]>([]);
  const [signers, setSigners] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [overrideOpen, setOverrideOpen] = useState<string | null>(null);
  const [overrideForm, setOverrideForm] = useState<{ reason: string; notes: string }>({ reason: "tolerance_acceptable", notes: "" });
  const [signerForm, setSignerForm] = useState<Record<Role, { name: string; email: string; phone: string }>>({
    caregiver: { name: "", email: "", phone: "" },
    client: { name: "", email: "", phone: "" },
    supervisor: { name: "", email: "", phone: "" },
  });
  const [role, setRole] = useState<Role>("caregiver");
  const [signerName, setSignerName] = useState("");
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  const refresh = async () => {
    if (!timesheetId) return;
    const [{ data: t }, { data: s }, { data: r }, { data: sn }] = await Promise.all([
      supabase.from("timesheets").select("*").eq("id", timesheetId).maybeSingle(),
      supabase.from("timesheet_signatures").select("*").eq("timesheet_id", timesheetId).order("signed_at"),
      supabase.from("timesheet_evv_recon").select("*").eq("timesheet_id", timesheetId).order("visit_date"),
      supabase.from("timesheet_signers").select("*").eq("timesheet_id", timesheetId),
    ]);
    setTs(t); setSigs(s ?? []); setRecon(r ?? []); setSigners(sn ?? []);
    if (t?.client_id && t?.period_start && t?.period_end) {
      const { data: bs } = await supabase
        .from("sandata_batches")
        .select("id, label, period_start, period_end, program_type, payer, row_count, uploaded_at")
        .lte("period_start", t.period_end).gte("period_end", t.period_start)
        .order("uploaded_at", { ascending: false });
      setBatches(bs ?? []);
    }
    const next = { caregiver: { name: "", email: "", phone: "" }, client: { name: "", email: "", phone: "" }, supervisor: { name: "", email: "", phone: "" } } as Record<Role, any>;
    (sn ?? []).forEach((row: any) => {
      next[row.role as Role] = { name: row.signer_name ?? "", email: row.signer_email ?? "", phone: row.signer_phone ?? "" };
    });
    setSignerForm(next);
  };

  useEffect(() => { if (open) { refresh(); setSignature(""); setSignerName(""); } }, [open, timesheetId]);

  const reconcileFromCsv = async (file: File) => {
    setReconciling(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error("Empty CSV");
      const split = (l: string) => {
        const out: string[] = []; let cur = ""; let q = false;
        for (const c of l) { if (c === '"') { q = !q; continue; } if (c === "," && !q) { out.push(cur); cur = ""; continue; } cur += c; }
        out.push(cur); return out.map(s => s.trim());
      };
      const headers = split(lines[0]).map(h => h.toLowerCase());
      const idx = (...keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
      const di = idx("visitdate","servicedate","date");
      const si = idx("actualstart","callin","clockin","visitstart");
      const ei = idx("actualend","callout","clockout","visitend");
      if (di < 0 || si < 0 || ei < 0) throw new Error("Missing date / start / end columns");
      const rows = lines.slice(1).map(l => {
        const c = split(l);
        const dateRaw = (c[di] ?? "").slice(0,10);
        const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw :
          (() => { const d = new Date(dateRaw); return isNaN(d.getTime()) ? "" : d.toISOString().slice(0,10); })();
        const norm = (t: string) => {
          const m = (t||"").match(/(\d{1,2}):(\d{2})/); if (!m) return "";
          let h = parseInt(m[1]); const mm = m[2];
          if (/pm/i.test(t) && h < 12) h += 12;
          if (/am/i.test(t) && h === 12) h = 0;
          return `${String(h).padStart(2,"0")}:${mm}`;
        };
        return { date, start: norm(c[si] ?? ""), end: norm(c[ei] ?? "") };
      }).filter(r => r.date && r.start && r.end);
      const { data, error } = await supabase.functions.invoke("timesheet-reconcile-sandata", {
        body: { timesheet_id: timesheetId, sandata_rows: rows },
      });
      if (error) throw error;
      logAudit("verify", "timesheet_evv_recon", timesheetId);
      toast.success(`Reconciled — ${data.mismatch_count} mismatch${data.mismatch_count === 1 ? "" : "es"}`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Reconcile failed");
    } finally { setReconciling(false); }
  };

  const reconcileFromBatch = async (batch_id?: string) => {
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke("timesheet-reconcile-sandata", {
        body: { timesheet_id: timesheetId, batch_id, auto_select: !batch_id },
      });
      if (error) throw error;
      logAudit("verify", "timesheet_evv_recon", timesheetId);
      toast.success(`Reconciled${data.batch_id ? " (batch matched)" : ""} — ${data.mismatch_count} mismatch${data.mismatch_count === 1 ? "" : "es"}`);
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Reconcile failed");
    } finally { setReconciling(false); }
  };

  const submitOverride = async (reconId: string) => {
    if (!overrideForm.reason) return toast.error("Pick a reason code");
    if (!overrideForm.notes.trim()) return toast.error("Notes required for audit trail");
    const { error } = await supabase.from("timesheet_evv_recon").update({
      override_reason: overrideForm.reason as any,
      override_notes: overrideForm.notes.trim(),
      override_by: user?.id ?? null,
      override_at: new Date().toISOString(),
      resolved: true,
    }).eq("id", reconId);
    if (error) return toast.error(error.message);
    logAudit("approve", "timesheet_evv_recon", reconId);
    // Recompute unresolved counter (best-effort via RPC; fallback to client count)
    const remaining = (recon || []).filter(r => r.id !== reconId && r.status !== "matched" && !r.resolved).length;
    await supabase.from("timesheets").update({ evv_unresolved_count: remaining }).eq("id", timesheetId);
    toast.success("Override approved");
    setOverrideOpen(null); setOverrideForm({ reason: "tolerance_acceptable", notes: "" });
    refresh();
  };

  const saveSigner = async (r: Role) => {
    const f = signerForm[r];
    if (!f.name.trim()) return toast.error("Signer name required");
    const existing = signers.find(s => s.role === r);
    if (existing) {
      const { error } = await supabase.from("timesheet_signers").update({
        signer_name: f.name.trim(), signer_email: f.email.trim() || null, signer_phone: f.phone.trim() || null,
      }).eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("timesheet_signers").insert({
        timesheet_id: timesheetId, role: r,
        signer_name: f.name.trim(), signer_email: f.email.trim() || null, signer_phone: f.phone.trim() || null,
      });
      if (error) return toast.error(error.message);
    }
    toast.success(`${ROLE_LABEL[r]} contact saved`);
    refresh();
  };

  const sendReminders = async (force = false) => {
    setSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke("timesheet-signing-reminders", {
        body: { timesheet_id: timesheetId, force, sign_url_base: `${window.location.origin}/` },
      });
      if (error) throw error;
      logAudit("submit", "timesheet_reminders", timesheetId);
      toast.success(`Reminders dispatched — ${data.sent?.length ?? 0} message(s)`);
    } catch (e: any) {
      toast.error(e.message || "Reminder send failed");
    } finally { setSendingReminders(false); }
  };

  const taken = new Set((sigs ?? []).map(s => s.role));
  const remaining: Role[] = (["caregiver","client","supervisor"] as Role[]).filter(r => !taken.has(r));

  useEffect(() => { if (remaining.length) setRole(remaining[0]); }, [sigs.length]);

  const sign = async () => {
    if (!signerName.trim()) return toast.error("Enter signer's printed name");
    if (!signature) return toast.error("Please sign in the box");
    if ((ts?.evv_unresolved_count ?? 0) > 0) {
      return toast.error("Resolve or override all EVV mismatches before signing");
    }
    setSaving(true);
    try {
      const ua = navigator.userAgent;
      let ip = "";
      try { const r = await fetch("https://api.ipify.org?format=json"); ip = (await r.json()).ip; } catch { /* optional */ }
      const { error } = await supabase.from("timesheet_signatures").insert({
        timesheet_id: timesheetId, role, signer_name: signerName.trim(),
        signer_user_id: user?.id ?? null, signature_png: signature,
        ip_address: ip || null, user_agent: ua,
      });
      if (error) throw error;
      logAudit("sign", "timesheet", `${timesheetId}:${role}`);
      toast.success(`${ROLE_LABEL[role]} signature captured`);
      setSignature(""); setSignerName("");
      await refresh();
      onSigned?.();
    } catch (e: any) {
      toast.error(e.message || "Sign failed");
    } finally { setSaving(false); }
  };

  const locked = ts?.status === "locked" || ts?.status === "signed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            E-Sign Timesheet
            {locked ? <Badge variant="default"><Lock className="h-3 w-3 mr-1" />Locked</Badge>
                    : <Badge variant="secondary">{sigs.length}/3 signed</Badge>}
          </DialogTitle>
        </DialogHeader>

        {ts && (
          <div className="text-xs text-muted-foreground border rounded p-2 grid grid-cols-2 gap-1">
            <div><b>Period:</b> {ts.period_start} → {ts.period_end}</div>
            <div><b>EVV hrs:</b> {Number(ts.evv_hours).toFixed(2)}</div>
            <div><b>Approved hrs:</b> {Number(ts.approved_hours).toFixed(2)}</div>
            <div><b>Variance:</b> {Number(ts.variance_hours).toFixed(2)}</div>
            <div className="col-span-2 flex items-center gap-2 mt-1">
              {ts.evv_reconciled_at ? (
                ts.evv_mismatch_count > 0
                  ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />{ts.evv_mismatch_count} Sandata mismatch</Badge>
                  : <Badge><ShieldCheck className="h-3 w-3 mr-1" />Sandata reconciled</Badge>
              ) : <Badge variant="outline">Not reconciled</Badge>}
              <span className="text-[11px] text-muted-foreground">{ts.evv_reconciled_at ? `at ${new Date(ts.evv_reconciled_at).toLocaleString()}` : ""}</span>
            </div>
          </div>
        )}

        {/* Sandata Reconciliation */}
        <div className="border rounded p-3 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-medium flex items-center gap-1"><FileSpreadsheet className="h-4 w-4" />Sandata EVV reconciliation</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="secondary" disabled={reconciling} onClick={() => reconcileFromBatch()}>
                <Wand2 className="h-3 w-3 mr-1" />Auto-pick batch
              </Button>
              {batches.length > 0 && (
                <Select onValueChange={(v) => reconcileFromBatch(v)}>
                  <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue placeholder="Use specific batch…" /></SelectTrigger>
                  <SelectContent>
                    {batches.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.label} • {b.program_type ?? "—"} • {b.row_count} rows
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <label className="text-xs">
                <input type="file" accept=".csv,text/csv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) reconcileFromCsv(f); e.currentTarget.value = ""; }} />
                <span className={`px-3 py-1 rounded border cursor-pointer ${reconciling ? "opacity-50" : "hover:bg-accent"}`}>
                  {reconciling ? "Reconciling..." : "One-off CSV"}
                </span>
              </label>
            </div>
          </div>
          {recon.length === 0 && <p className="text-xs text-muted-foreground">Auto-pick selects the best Sandata batch covering this client + period (matched on Medicaid ID / name). Tolerance: ±7 min. Or upload a one-off CSV.</p>}
          {batches.length > 0 && recon.length === 0 && (
            <p className="text-[11px] text-muted-foreground">{batches.length} batch{batches.length === 1 ? "" : "es"} cover this period.</p>
          )}
          {recon.length > 0 && (
            <div className="text-xs max-h-40 overflow-y-auto">
              <table className="w-full">
                <thead><tr className="text-left text-muted-foreground"><th>Date</th><th>System</th><th>Sandata</th><th>Δ start</th><th>Δ end</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {recon.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td>{r.visit_date}</td>
                      <td>{r.system_start || "—"} – {r.system_end || "—"}</td>
                      <td>{r.sandata_start || "—"} – {r.sandata_end || "—"}</td>
                      <td>{r.start_delta_min ?? "—"}</td>
                      <td>{r.end_delta_min ?? "—"}</td>
                      <td className={r.status === "matched" ? "text-primary" : r.resolved ? "text-muted-foreground line-through" : "text-destructive"}>
                        {r.status}{r.resolved ? " (overridden)" : ""}
                      </td>
                      <td>
                        {r.status !== "matched" && !r.resolved && !locked && (
                          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { setOverrideOpen(r.id); setOverrideForm({ reason: "tolerance_acceptable", notes: "" }); }}>
                            Override
                          </Button>
                        )}
                        {r.resolved && (
                          <span title={r.override_notes ?? ""} className="inline-flex items-center text-[11px] text-primary"><CheckCircle2 className="h-3 w-3 mr-1" />{r.override_reason}</span>
                        )}
                        {overrideOpen === r.id && (
                          <div className="mt-2 border rounded p-2 bg-muted/40 space-y-1 w-[260px]">
                            <Select value={overrideForm.reason} onValueChange={(v) => setOverrideForm({ ...overrideForm, reason: v })}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="caregiver_forgot_clockout">Caregiver forgot clock-out</SelectItem>
                                <SelectItem value="caregiver_forgot_clockin">Caregiver forgot clock-in</SelectItem>
                                <SelectItem value="phone_or_app_issue">Phone / app issue</SelectItem>
                                <SelectItem value="sandata_outage">Sandata outage</SelectItem>
                                <SelectItem value="manual_visit_approved">Manual visit approved</SelectItem>
                                <SelectItem value="documentation_correction">Documentation correction</SelectItem>
                                <SelectItem value="tolerance_acceptable">Variance within policy</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <Textarea rows={2} placeholder="Audit notes (required)" value={overrideForm.notes}
                              onChange={(e) => setOverrideForm({ ...overrideForm, notes: e.target.value.slice(0, 500) })} className="text-xs" />
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setOverrideOpen(null)}>Cancel</Button>
                              <Button size="sm" className="h-6 px-2" onClick={() => submitOverride(r.id)}>Approve</Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(ts?.evv_unresolved_count ?? 0) > 0 && !locked && (
            <p className="text-xs text-destructive">⚠ {ts.evv_unresolved_count} unresolved mismatch{ts.evv_unresolved_count === 1 ? "" : "es"} — override with reason + notes before signing.</p>
          )}
          {ts?.evv_reconciled_at && (ts?.evv_unresolved_count ?? 0) === 0 && (
            <p className="text-xs text-primary">✓ All discrepancies resolved — ready to sign.</p>
          )}
        </div>

        {/* Signer contacts */}
        <div className="border rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-1"><Bell className="h-4 w-4" />Signer contacts & reminders</h4>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => sendReminders(false)} disabled={sendingReminders || locked}>Send reminders</Button>
              <Button size="sm" variant="ghost" onClick={() => sendReminders(true)} disabled={sendingReminders || locked}>Force resend</Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Email + SMS reminders are sent every 24h to unsigned roles until the timesheet locks.</p>
          {(["caregiver","client","supervisor"] as Role[]).map(r => (
            <div key={r} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-2 text-xs font-medium pt-2">{ROLE_LABEL[r]}</div>
              <div className="col-span-3"><Input placeholder="Name" value={signerForm[r].name} onChange={(e) => setSignerForm({ ...signerForm, [r]: { ...signerForm[r], name: e.target.value.slice(0,120) } })} /></div>
              <div className="col-span-3"><Input placeholder="Email" value={signerForm[r].email} onChange={(e) => setSignerForm({ ...signerForm, [r]: { ...signerForm[r], email: e.target.value.slice(0,255) } })} /></div>
              <div className="col-span-2"><Input placeholder="+1555…" value={signerForm[r].phone} onChange={(e) => setSignerForm({ ...signerForm, [r]: { ...signerForm[r], phone: e.target.value.slice(0,20) } })} /></div>
              <div className="col-span-2"><Button size="sm" variant="secondary" onClick={() => saveSigner(r)} className="w-full">Save</Button></div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Signatures captured</h4>
          {sigs.length === 0 && <p className="text-xs text-muted-foreground">No signatures yet.</p>}
          {sigs.map((s) => (
            <div key={s.id} className="border rounded p-2 flex items-center gap-3">
              <img src={s.signature_png} alt={s.role} className="h-12 bg-card border rounded" />
              <div className="text-xs flex-1">
                <div><b>{ROLE_LABEL[s.role as Role]}</b> — {s.signer_name}</div>
                <div className="text-muted-foreground">
                  {new Date(s.signed_at).toLocaleString()} • IP {s.ip_address || "—"}
                </div>
              </div>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
          ))}
        </div>

        {!locked && remaining.length > 0 && (
          <div className="space-y-3 border-t pt-3">
            <h4 className="text-sm font-medium">Add signature</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {remaining.map(r => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Printed name</Label>
                <Input value={signerName} onChange={(e) => setSignerName(e.target.value.slice(0, 120))} placeholder="Full legal name" />
              </div>
            </div>
            <SignaturePad value={signature} onChange={setSignature} label="Sign here" />
            <p className="text-[11px] text-muted-foreground">
              By signing you certify the hours and tasks shown are accurate. This signature is timestamped, IP-logged, and retained for Medicaid/state audit. Once all three roles sign, the timesheet locks automatically.
            </p>
            <Button onClick={sign} disabled={saving} className="w-full">{saving ? "Saving..." : `Capture ${ROLE_LABEL[role]} signature`}</Button>
          </div>
        )}

        {locked && (
          <div className="text-xs text-primary border rounded p-2 bg-primary/5">
            All required signatures captured. Timesheet is locked and retained for audit.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}