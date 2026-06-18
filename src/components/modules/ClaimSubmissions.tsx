import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, FileText, Download, Upload, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw, GitCompare, Archive, Activity, FileSpreadsheet } from "lucide-react";
import { CompanyBrandingHeader } from "@/components/CompanyBrandingHeader";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Claim = {
  id: string;
  claim_number: string;
  client_id: string;
  payer_id: string;
  service_start: string;
  service_end: string;
  total_charge: number;
  status: string;
};
type Submission = {
  id: string;
  file_name: string;
  storage_path: string | null;
  isa_control_number: string;
  claim_count: number;
  total_charge: number;
  test_mode: boolean;
  status: string;
  ack_999_status: string | null;
  ack_277ca_status: string | null;
  era_835_status: string | null;
  generated_at: string;
  parent_submission_id?: string | null;
  regeneration_count?: number;
  parity_status?: string | null;
  parity_diff?: any;
};

export function ClaimSubmissions() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [edi, setEdi] = useState<string>("");
  const [receiverId, setReceiverId] = useState("OFFALLY");
  const [receiverName, setReceiverName] = useState("OFFICE ALLY");
  const [testMode, setTestMode] = useState(true);
  const [ackText, setAckText] = useState("");
  const [ackForSubmission, setAckForSubmission] = useState<string>("");

  const load = async () => {
    const [{ data: cl }, { data: sub }, { data: company }] = await Promise.all([
      (supabase as any).from("claims").select("*").in("status", ["draft", "ready"]).order("created_at", { ascending: false }).limit(200),
      (supabase as any).from("claim_submissions").select("*").order("generated_at", { ascending: false }).limit(50),
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await (supabase as any).from("profiles").select("default_company_id").eq("id", user!.id).maybeSingle();
        return (supabase as any).from("companies").select("edi_test_mode").eq("id", prof?.default_company_id).maybeSingle();
      })(),
    ]);
    setClaims(cl ?? []);
    setSubmissions(sub ?? []);
    setTestMode(company?.edi_test_mode !== false);
  };

  useEffect(() => { load(); }, []);

  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([k]) => k), [selected]);

  const callGenerate = async (mode: "validate" | "generate") => {
    if (!selectedIds.length) { toast.error("Pick at least one claim"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-837p", {
        body: { claim_ids: selectedIds, receiver_id: receiverId, receiver_name: receiverName, mode, commit: mode === "generate" },
      });
      if (error) throw error;
      setReport(data?.validation ?? null);
      setEdi(data?.edi ?? "");
      if (mode === "validate") {
        toast[data?.ok ? "success" : "warning"](data?.ok ? "All checks passed" : "Validation issues found");
      } else if (data?.ok) {
        toast.success(`Generated ${data.file_name}`);
        if (data.signed_url) window.open(data.signed_url, "_blank");
        await load();
      } else {
        toast.error("Cannot generate — fix validation issues first");
      }
    } catch (e: any) {
      toast.error(e?.message || "Generate failed");
    } finally { setBusy(false); }
  };

  const downloadEdi = () => {
    if (!edi) return;
    const blob = new Blob([edi], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `claim-837P-preview.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSubmission = async (s: Submission) => {
    if (!s.storage_path) { toast.error("No file stored"); return; }
    const { data } = await (supabase as any).storage.from("claim-files").createSignedUrl(s.storage_path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const csvEscape = (v: any): string => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const downloadSubmissionCsv = async (s: Submission) => {
    setBusy(true);
    try {
      const { data: links } = await (supabase as any)
        .from("claim_submission_claims").select("claim_id").eq("submission_id", s.id);
      const claimIds: string[] = (links ?? []).map((l: any) => l.claim_id);
      if (!claimIds.length) { toast.error("No claims linked to this submission"); return; }

      const [{ data: cls }, { data: lines }, { data: diags }, { data: payers }, { data: clients }] = await Promise.all([
        (supabase as any).from("claims").select("*").in("id", claimIds),
        (supabase as any).from("claim_lines").select("*").in("claim_id", claimIds),
        (supabase as any).from("claim_diagnoses").select("*").in("claim_id", claimIds),
        (supabase as any).from("payers").select("id,name,payer_id_electronic"),
        (supabase as any).from("clients").select("id,name,member_id,dob"),
      ]);

      const payerMap = new Map<string, any>((payers ?? []).map((p: any) => [p.id, p]));
      const clientMap = new Map<string, any>((clients ?? []).map((c: any) => [c.id, c]));
      const dxByClaim = new Map<string, any[]>();
      (diags ?? []).forEach((d: any) => {
        if (!dxByClaim.has(d.claim_id)) dxByClaim.set(d.claim_id, []);
        dxByClaim.get(d.claim_id)!.push(d);
      });

      const header = [
        "submission_file","isa_control_number","test_mode",
        "claim_number","claim_status","client_name","client_member_id","client_dob",
        "payer_name","payer_id_electronic",
        "service_start","service_end","total_charge","total_paid","total_adjusted",
        "diagnoses_icd10",
        "line_number","line_service_date","line_service_code",
        "line_modifiers","line_pos","line_units","line_unit_rate","line_charge",
        "line_diagnosis_pointers",
      ];
      const rows: string[][] = [header];

      for (const c of (cls ?? [])) {
        const cl = clientMap.get(c.client_id) || {};
        const py = payerMap.get(c.payer_id) || {};
        const dx = (dxByClaim.get(c.id) || []).sort((a, b) => a.rank - b.rank).map((d: any) => d.icd10_code).join("|");
        const myLines = (lines ?? []).filter((l: any) => l.claim_id === c.id)
          .sort((a: any, b: any) => (a.service_date || "").localeCompare(b.service_date || ""));
        const base = [
          s.file_name, s.isa_control_number, s.test_mode ? "TEST" : "PROD",
          c.claim_number, c.status, cl.name || "", cl.member_id || "", cl.dob || "",
          py.name || "", py.payer_id_electronic || "",
          c.service_start, c.service_end, c.total_charge, c.total_paid, c.total_adjusted,
          dx,
        ];
        if (!myLines.length) {
          rows.push([...base, "", "", "", "", "", "", "", "", ""].map(csvEscape));
        } else {
          myLines.forEach((l: any, idx: number) => {
            const mods = [l.modifier, l.modifier_2, l.modifier_3, l.modifier_4].filter(Boolean).join("|");
            rows.push([
              ...base,
              String(idx + 1), l.service_date, l.service_code,
              mods, l.pos_code || "", l.units, l.unit_rate, l.charge,
              l.diagnosis_pointers || "",
            ].map(csvEscape));
          });
        }
      }

      const csv = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${s.file_name.replace(/\.txt$/i, "")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length - 1} row(s) to CSV`);
    } catch (e: any) {
      toast.error(e?.message || "CSV export failed");
    } finally { setBusy(false); }
  };

  const regenerate = async (s: Submission) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-837p", {
        body: {
          regenerate_from: s.id,
          claim_ids: [],
          receiver_id: receiverId,
          receiver_name: receiverName,
          mode: "generate",
          commit: true,
          force_test_mode: true,
        },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success(`Regenerated in TEST mode — ${data.file_name}`);
        await load();
      } else {
        toast.error("Regeneration blocked by validation");
        setReport(data?.validation ?? null);
      }
    } catch (e: any) {
      toast.error(e?.message || "Regenerate failed");
    } finally { setBusy(false); }
  };

  const parityBadge = (s: Submission) => {
    if (!s.test_mode || !s.parity_status) return null;
    const variant = s.parity_status === "match" ? "secondary" : s.parity_status === "mismatch" ? "destructive" : "outline";
    return <Badge variant={variant as any}><GitCompare className="h-3 w-3 mr-1" />Parity: {s.parity_status}</Badge>;
  };

  const ingestAck = async () => {
    if (!ackText.trim()) { toast.error("Paste an ACK payload (999/277CA/835)"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-claim-ack", {
        body: { submission_id: ackForSubmission || undefined, payload: ackText },
      });
      if (error) throw error;
      toast.success(`Recorded ${data.ack_type} (${data.status})`);
      setAckText(""); setAckForSubmission("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Ingest failed");
    } finally { setBusy(false); }
  };

  const flipTestMode = async (val: boolean) => {
    setTestMode(val);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await (supabase as any).from("profiles").select("default_company_id").eq("id", user!.id).maybeSingle();
    if (prof?.default_company_id) {
      await (supabase as any).from("companies").update({ edi_test_mode: val }).eq("id", prof.default_company_id);
      toast.success(`EDI mode set to ${val ? "TEST" : "PRODUCTION"}`);
    }
  };

  const downloadAuditPackets = async (submissionId: string) => {
    setBusy(true);
    try {
      const { data: links } = await (supabase as any)
        .from("claim_submission_claims")
        .select("claim_id")
        .eq("submission_id", submissionId);
      const ids: string[] = (links ?? []).map((l: any) => l.claim_id);
      if (!ids.length) { toast.error("No claims linked to this submission"); return; }
      let okCount = 0;
      for (const claim_id of ids) {
        const { data, error } = await supabase.functions.invoke("claim-audit-packet", { body: { claim_id } });
        if (error) { toast.error(error.message); continue; }
        if (data?.url) {
          window.open(data.url, "_blank");
          okCount++;
        }
      }
      if (okCount) toast.success(`Generated ${okCount} audit packet(s)`);
    } catch (e: any) {
      toast.error(e?.message || "Audit packet failed");
    } finally { setBusy(false); }
  };

  const checkClaimStatus = async (submissionId: string) => {
    setBusy(true);
    try {
      const { data: links } = await (supabase as any)
        .from("claim_submission_claims").select("claim_id").eq("submission_id", submissionId);
      const ids: string[] = (links ?? []).map((l: any) => l.claim_id);
      if (!ids.length) { toast.error("No claims linked to this submission"); return; }
      let ok = 0;
      for (const claim_id of ids) {
        const { data, error } = await supabase.functions.invoke("check-claim-status-276", { body: { claim_id } });
        if (!error && data?.ok) ok++;
      }
      toast.success(`Pulled status for ${ok}/${ids.length} claim(s) (276/277)`);
    } catch (e: any) {
      toast.error(e?.message || "Status check failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <CompanyBrandingHeader />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">837P Claim Submissions</h1>
          <p className="text-muted-foreground">HIPAA X12N 005010X222A1 generator, validator and ACK reconciliation.</p>
        </div>
        <Badge variant={testMode ? "secondary" : "default"} className="text-sm">
          {testMode ? "TEST mode (ISA15=T)" : "PRODUCTION (ISA15=P)"}
        </Badge>
      </div>

      <LegalDisclaimer variant="financialEstimate" />
      <LegalDisclaimer variant="evvCompliance" />

      {testMode && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Test mode — files are flagged for clearinghouse testing only.</p>
              <p className="text-muted-foreground">Switch to production after your clearinghouse confirms enrollment and SNIP validation has passed end-to-end.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => flipTestMode(false)}>I have completed enrollment — go live</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="ack">Upload ACK / 835</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submission settings</CardTitle>
              <CardDescription>Receiver values come from your clearinghouse. Office Ally default shown.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Receiver ID (ISA08)</Label><Input value={receiverId} onChange={(e) => setReceiverId(e.target.value)} /></div>
              <div><Label>Receiver Name</Label><Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Eligible claims ({claims.length})</CardTitle>
              <CardDescription>Only draft / ready claims are listed.</CardDescription>
            </CardHeader>
            <CardContent>
              {claims.length === 0 && <p className="text-sm text-muted-foreground">No claims available. Run a billing cycle to create claims.</p>}
              <div className="space-y-2 max-h-72 overflow-auto">
                {claims.map(c => (
                  <label key={c.id} className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={!!selected[c.id]} onCheckedChange={(v) => setSelected(s => ({ ...s, [c.id]: !!v }))} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.claim_number}</p>
                      <p className="text-xs text-muted-foreground">{c.service_start} → {c.service_end} · ${Number(c.total_charge).toFixed(2)}</p>
                    </div>
                    <Badge variant="outline">{c.status}</Badge>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => callGenerate("validate")} disabled={busy} variant="outline">
                  <ShieldCheck className="h-4 w-4 mr-2" />Validate
                </Button>
                <Button onClick={() => callGenerate("generate")} disabled={busy}>
                  <FileText className="h-4 w-4 mr-2" />Generate 837P
                </Button>
                {edi && <Button variant="ghost" onClick={downloadEdi}><Download className="h-4 w-4 mr-2" />Download preview</Button>}
              </div>
            </CardContent>
          </Card>

          {report && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {report.ok ? <CheckCircle2 className="h-5 w-5 text-success" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
                  Validation report (SNIP L1–L4)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.ok && <p className="text-sm text-success">All claims passed validation and are ready for submission.</p>}
                <ul className="space-y-1 text-sm max-h-72 overflow-auto">
                  {report.issues?.map((i: any, idx: number) => (
                    <li key={idx} className="flex gap-2">
                      <Badge variant={i.level >= 3 ? "destructive" : "secondary"}>L{i.level}</Badge>
                      <span className="text-xs text-muted-foreground">{i.claim_id?.slice(0, 12)} {i.segment}</span>
                      <span>{i.message}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {edi && (
            <Card>
              <CardHeader><CardTitle className="text-base">EDI preview</CardTitle></CardHeader>
              <CardContent><pre className="text-[10px] font-mono whitespace-pre-wrap bg-muted p-3 rounded max-h-72 overflow-auto">{edi}</pre></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-3">
          {submissions.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
          {submissions.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    ISA {s.isa_control_number} · {s.claim_count} claim(s) · ${Number(s.total_charge).toFixed(2)} · {new Date(s.generated_at).toLocaleString()}
                    {s.regeneration_count ? ` · regen #${s.regeneration_count}` : ""}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {s.test_mode && <Badge variant="secondary">TEST</Badge>}
                    <Badge variant="outline">999: {s.ack_999_status ?? "—"}</Badge>
                    <Badge variant="outline">277CA: {s.ack_277ca_status ?? "—"}</Badge>
                    <Badge variant="outline">835: {s.era_835_status ?? "—"}</Badge>
                    {parityBadge(s)}
                  </div>
                  {s.parity_status === "mismatch" && Array.isArray(s.parity_diff) && s.parity_diff.length > 0 && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-destructive">View {s.parity_diff.length} parity diff(s)</summary>
                      <ul className="mt-1 space-y-0.5 font-mono text-[11px]">
                        {s.parity_diff.map((d: any, i: number) => (
                          <li key={i}>{d.field}: expected <b>{String(d.expected)}</b>, got <b>{String(d.actual)}</b></li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadSubmission(s)}><Download className="h-4 w-4 mr-1" />File</Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => downloadSubmissionCsv(s)}>
                    <FileSpreadsheet className="h-4 w-4 mr-1" />CSV
                  </Button>
                  {s.test_mode && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => regenerate(s)}>
                      <RefreshCw className="h-4 w-4 mr-1" />Regenerate (TEST)
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => downloadAuditPackets(s.id)}>
                    <Archive className="h-4 w-4 mr-1" />Audit Packet
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => checkClaimStatus(s.id)}>
                    <Activity className="h-4 w-4 mr-1" />Check Status (276)
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAckForSubmission(s.id)}><Upload className="h-4 w-4 mr-1" />Attach ACK</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ack" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload ACK / 835 remittance</CardTitle>
              <CardDescription>Paste the raw EDI text (999, 277CA, or 835) you received from the clearinghouse.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ackForSubmission && <p className="text-xs text-muted-foreground">Linked to submission: {ackForSubmission.slice(0, 8)}…</p>}
              <Textarea value={ackText} onChange={(e) => setAckText(e.target.value)} rows={10} className="font-mono text-xs" placeholder="ISA*00*..." />
              <Button onClick={ingestAck} disabled={busy}><Upload className="h-4 w-4 mr-2" />Ingest</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}