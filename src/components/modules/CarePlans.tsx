import { useEffect, useState, useCallback } from "react";
import { CompanyBrandingHeader } from "@/components/CompanyBrandingHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Plus, Printer, Upload, FileText, Sparkles } from "lucide-react";
import { printPage } from "@/lib/print-utils";
import { TimesheetSigningDialog } from "@/components/TimesheetSigningDialog";
import { SandataBatchManager } from "@/components/SandataBatchManager";
import { Lock, PenLine } from "lucide-react";

interface CarePlan {
  id: string; client_id: string; diagnosis: string | null; goals: string | null;
  tasks: string[]; frequency: string | null; start_date: string | null; review_date: string | null;
  physician: string | null; active: boolean;
  program_type?: string | null; program_label?: string | null;
  case_manager_name?: string | null; case_manager_agency?: string | null;
  medicaid_id?: string | null; authorization_number?: string | null;
  total_weekly_hours?: number | null; effective_start?: string | null; effective_end?: string | null;
  parser_confidence?: number | null;
}

export function CarePlans() {
  const { clients, caregivers } = useHomeCareContext();
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: "", diagnosis: "", goals: "", tasksRaw: "", frequency: "", start_date: "", review_date: "", physician: "" });
  const [parseOpen, setParseOpen] = useState(false);
  const [parseClient, setParseClient] = useState("");
  const [parseFile, setParseFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [tsOpen, setTsOpen] = useState(false);
  const [tsForm, setTsForm] = useState({ client_id: "", caregiver_id: "", period_start: "", period_end: "" });
  const [tsLoading, setTsLoading] = useState(false);
  const [categories, setCategories] = useState<Record<string, any[]>>({});
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [signOpen, setSignOpen] = useState(false);
  const [activeTimesheetId, setActiveTimesheetId] = useState<string>("");

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("care_plans").select("*").order("created_at", { ascending: false });
    if (data) setPlans(data as CarePlan[]);
    if (data) {
      const ids = (data as CarePlan[]).map(p => p.id);
      if (ids.length) {
        const { data: cats } = await supabase.from("care_plan_categories").select("*").in("care_plan_id", ids).order("sort_order");
        const grouped: Record<string, any[]> = {};
        (cats ?? []).forEach((c: any) => { (grouped[c.care_plan_id] ||= []).push(c); });
        setCategories(grouped);
      }
    }
    const { data: ts } = await supabase.from("timesheets")
      .select("id, client_id, caregiver_id, period_start, period_end, status, evv_hours, approved_hours, variance_hours, locked_at")
      .order("period_end", { ascending: false }).limit(50);
    setTimesheets(ts ?? []);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const parsePdf = async () => {
    if (!parseClient || !parseFile) return toast.error("Select a client and a PDF");
    setParsing(true);
    try {
      const folder = `clients/${parseClient}`;
      const path = `${folder}/${Date.now()}-${parseFile.name}`;
      const { error: upErr } = await supabase.storage.from("documents").upload(path, parseFile);
      if (upErr) throw upErr;
      const { data: doc, error: dErr } = await supabase.from("documents").insert({
        storage_path: path, file_name: parseFile.name, mime_type: parseFile.type, size_bytes: parseFile.size,
        doc_type: "care_plan", client_id: parseClient,
      }).select("id").single();
      if (dErr) throw dErr;
      const { data, error } = await supabase.functions.invoke("parse-care-plan-pdf", {
        body: { document_id: doc.id, client_id: parseClient },
      });
      if (error) throw error;
      logAudit("create", "care_plan", data.care_plan_id);
      toast.success(`Parsed ${data.parsed?.program_label || data.parsed?.program_type || "care plan"} • ${data.parsed?.categories?.length || 0} categories`);
      setParseOpen(false); setParseFile(null); setParseClient("");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Parse failed");
    } finally { setParsing(false); }
  };

  const generateTimesheet = async () => {
    if (!tsForm.client_id || !tsForm.caregiver_id || !tsForm.period_start || !tsForm.period_end) return toast.error("Fill all fields");
    setTsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-timesheet-pdf", { body: tsForm });
      if (error) throw error;
      const w = window.open("", "_blank");
      if (w) { w.document.write(data.html); w.document.close(); }
      logAudit("export", "timesheet", `${tsForm.client_id}:${tsForm.period_start}/${tsForm.period_end}`);
      setTsOpen(false);
      if (data.timesheet_id) { setActiveTimesheetId(data.timesheet_id); setSignOpen(true); }
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Generate failed");
    } finally { setTsLoading(false); }
  };

  const save = async () => {
    if (!form.client_id) return toast.error("Select a client");
    const tasks = form.tasksRaw.split(",").map(s => s.trim()).filter(Boolean);
    const { error } = await supabase.from("care_plans").insert({
      client_id: form.client_id, diagnosis: form.diagnosis || null, goals: form.goals || null,
      tasks, frequency: form.frequency || null,
      start_date: form.start_date || null, review_date: form.review_date || null,
      physician: form.physician || null,
    });
    if (error) return toast.error(error.message);
    logAudit("create", "care_plan", form.client_id);
    toast.success("Care plan saved");
    setOpen(false);
    setForm({ client_id: "", diagnosis: "", goals: "", tasksRaw: "", frequency: "", start_date: "", review_date: "", physician: "" });
    refresh();
  };

  return (
    <div className="space-y-6">
      <CompanyBrandingHeader />
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Care Plans</CardTitle>
            <CardDescription>Plan of care goals, tasks, and review dates per client</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => printPage()} className="shrink-0"><Printer className="h-4 w-4 mr-1" />Print</Button>
            <Button variant="outline" size="sm" onClick={() => setTsOpen(true)} className="shrink-0"><FileText className="h-4 w-4 mr-1" />Timesheet</Button>
            <Button variant="secondary" size="sm" onClick={() => setParseOpen(true)} className="shrink-0"><Sparkles className="h-4 w-4 mr-1" />Parse PDF</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" className="shrink-0"><Plus className="h-4 w-4 mr-1" />New plan</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New care plan</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Client</Label>
                    <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
                  <div><Label>Goals</Label><Textarea value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} /></div>
                  <div><Label>Tasks (comma-separated)</Label><Input value={form.tasksRaw} onChange={(e) => setForm({ ...form, tasksRaw: e.target.value })} placeholder="Bathing, Medication, Meal prep" /></div>
                  <div><Label>Frequency</Label><Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="3x/week" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                    <div><Label>Review</Label><Input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} /></div>
                  </div>
                  <div><Label>Physician</Label><Input value={form.physician} onChange={(e) => setForm({ ...form, physician: e.target.value })} /></div>
                  <Button onClick={save} className="w-full">Save plan</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Program</TableHead><TableHead>Categories</TableHead><TableHead>Wk hrs</TableHead><TableHead>Review</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {plans.map(p => {
                const client = clients.find(c => c.id === p.client_id);
                const overdue = p.review_date && new Date(p.review_date) < new Date();
                const cats = categories[p.id] ?? [];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{client?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {p.program_label || p.program_type || "—"}
                      {p.parser_confidence != null && <Badge variant="outline" className="ml-2">AI {(p.parser_confidence*100).toFixed(0)}%</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {cats.length ? cats.map(c => `${c.category_name} (${Number(c.weekly_hours_approved).toFixed(2)}h)`).join(" • ") : ((p.tasks ?? []).slice(0,3).join(", ") || "—")}
                    </TableCell>
                    <TableCell className="text-xs">{p.total_weekly_hours ? `${Number(p.total_weekly_hours).toFixed(2)}` : "—"}</TableCell>
                    <TableCell className="text-xs">
                      {p.review_date || "—"}
                      {overdue && <Badge variant="destructive" className="ml-2">overdue</Badge>}
                    </TableCell>
                    <TableCell>{p.active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  </TableRow>
                );
              })}
              {plans.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No care plans yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timesheets — Audit ready</CardTitle>
          <CardDescription>Generated timesheets with caregiver, client, and supervisor e-signatures</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Caregiver</TableHead><TableHead>Period</TableHead><TableHead>EVV</TableHead><TableHead>Approved</TableHead><TableHead>Variance</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {timesheets.map((t) => {
                const c = clients.find(x => x.id === t.client_id);
                const cg = caregivers.find(x => x.id === t.caregiver_id);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{c?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{cg?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{t.period_start} → {t.period_end}</TableCell>
                    <TableCell className="text-xs">{Number(t.evv_hours).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">{Number(t.approved_hours).toFixed(2)}</TableCell>
                    <TableCell className={`text-xs ${Math.abs(t.variance_hours) > 0.5 ? "text-destructive" : ""}`}>{Number(t.variance_hours).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">
                      {t.status === "draft" && <Badge variant="secondary">Draft</Badge>}
                      {t.status === "signed" && <Badge><Lock className="h-3 w-3 mr-1" />Signed</Badge>}
                      {t.status === "locked" && <Badge><Lock className="h-3 w-3 mr-1" />Locked</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => { setActiveTimesheetId(t.id); setSignOpen(true); }}>
                        <PenLine className="h-3 w-3 mr-1" />{t.status === "draft" ? "Sign" : "View"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {timesheets.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No timesheets yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SandataBatchManager />

      {activeTimesheetId && (
        <TimesheetSigningDialog
          timesheetId={activeTimesheetId}
          open={signOpen}
          onOpenChange={setSignOpen}
          onSigned={refresh}
        />
      )}

      <Dialog open={parseOpen} onOpenChange={setParseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Parse Care Plan PDF (any program)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Upload the case manager's Care Plan / Calculator PDF. AI auto-detects the program (IHSS, CDASS, HCBS, State Plan PC, PDN, VA, Private Pay, etc.) and extracts categories, tasks, minutes and frequency.</p>
            <div>
              <Label>Client</Label>
              <Select value={parseClient} onValueChange={setParseClient}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Care Plan PDF</Label>
              <Input type="file" accept="application/pdf,image/*" onChange={(e) => setParseFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button onClick={parsePdf} disabled={parsing} className="w-full">
              <Upload className="h-4 w-4 mr-2" />{parsing ? "Parsing with AI..." : "Upload & Parse"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={tsOpen} onOpenChange={setTsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate Timesheet (EVV-reconciled)</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Generates the agency timesheet from EVV-verified clock-in/out, reconciled against the Care Plan approved hours.</p>
            <div>
              <Label>Client</Label>
              <Select value={tsForm.client_id} onValueChange={(v) => setTsForm({ ...tsForm, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Caregiver</Label>
              <Select value={tsForm.caregiver_id} onValueChange={(v) => setTsForm({ ...tsForm, caregiver_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select caregiver" /></SelectTrigger>
                <SelectContent>{caregivers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Period start</Label><Input type="date" value={tsForm.period_start} onChange={(e) => setTsForm({ ...tsForm, period_start: e.target.value })} /></div>
              <div><Label>Period end</Label><Input type="date" value={tsForm.period_end} onChange={(e) => setTsForm({ ...tsForm, period_end: e.target.value })} /></div>
            </div>
            <Button onClick={generateTimesheet} disabled={tsLoading} className="w-full">
              <FileText className="h-4 w-4 mr-2" />{tsLoading ? "Generating..." : "Generate & Open"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}