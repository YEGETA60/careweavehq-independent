import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pill, Activity, ClipboardList, AlertTriangle, FileCheck2, Plus, Check, X as XIcon } from "lucide-react";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

export function Clinical() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Clinical</h1>
        <p className="text-muted-foreground text-sm">Medications (eMAR), vitals, ADLs, incidents and assessments.</p>
      </div>
      <LegalDisclaimer variant="clinicalAi" />
      <Tabs defaultValue="emar" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="emar"><Pill className="h-4 w-4 mr-1" />eMAR</TabsTrigger>
          <TabsTrigger value="vitals"><Activity className="h-4 w-4 mr-1" />Vitals</TabsTrigger>
          <TabsTrigger value="adls"><ClipboardList className="h-4 w-4 mr-1" />ADLs</TabsTrigger>
          <TabsTrigger value="incidents"><AlertTriangle className="h-4 w-4 mr-1" />Incidents</TabsTrigger>
          <TabsTrigger value="assessments"><FileCheck2 className="h-4 w-4 mr-1" />Assessments</TabsTrigger>
        </TabsList>
        <TabsContent value="emar"><EmarTab /></TabsContent>
        <TabsContent value="vitals"><VitalsTab /></TabsContent>
        <TabsContent value="adls"><AdlsTab /></TabsContent>
        <TabsContent value="incidents"><IncidentsTab /></TabsContent>
        <TabsContent value="assessments"><AssessmentsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function useClients() {
  const [clients, setClients] = useState<any[]>([]);
  useEffect(() => {
    (supabase as any).from("clients").select("id,name").order("name").then(({ data }: any) => setClients(data ?? []));
  }, []);
  return clients;
}

/* ============== eMAR ============== */
function EmarTab() {
  const clients = useClients();
  const [clientId, setClientId] = useState<string>("");
  const [meds, setMeds] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    if (!clientId) return;
    const { data: m } = await (supabase as any).from("medications").select("*").eq("client_id", clientId).eq("active", true).order("name");
    setMeds(m ?? []);
    const { data: l } = await (supabase as any).from("medication_administrations").select("*").eq("client_id", clientId).order("administered_at", { ascending: false }).limit(50);
    setLogs(l ?? []);
  };
  useEffect(() => { refresh(); }, [clientId]);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px]">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {clientId && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Add Medication</Button></DialogTrigger>
            <MedicationDialog clientId={clientId} onSaved={() => { setOpen(false); refresh(); }} />
          </Dialog>
        )}
      </div>

      {clientId && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>Active Medications</CardTitle><CardDescription>Tap a med to record administration</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {meds.length === 0 && <p className="text-sm text-muted-foreground">No active medications.</p>}
              {meds.map(m => <MedRow key={m.id} med={m} onAdministered={refresh} />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Administration Log</CardTitle><CardDescription>Last 50 entries</CardDescription></CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {logs.length === 0 && <p className="text-sm text-muted-foreground">No log entries yet.</p>}
              {logs.map(l => {
                const med = meds.find(m => m.id === l.medication_id);
                return (
                  <div key={l.id} className="text-sm border rounded p-2 flex justify-between gap-2">
                    <div>
                      <div className="font-medium">{med?.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(l.administered_at || l.created_at).toLocaleString()} · {l.dose_given || med?.dose}</div>
                      {l.notes && <div className="text-xs mt-1">{l.notes}</div>}
                    </div>
                    <Badge variant={l.status === "administered" || l.status === "prn_given" ? "default" : "destructive"}>{l.status}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MedRow({ med, onAdministered }: { med: any; onAdministered: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded p-3 flex justify-between items-start gap-3">
      <div className="flex-1">
        <div className="font-medium flex flex-wrap items-center gap-2">
          {med.name} <span className="text-sm text-muted-foreground">{med.dose} · {med.route}</span>
          {med.is_prn && <Badge variant="secondary">PRN</Badge>}
          {med.controlled_class && <Badge variant="destructive">CII–{med.controlled_class}</Badge>}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{med.frequency}{med.scheduled_times?.length ? ` · ${med.scheduled_times.join(", ")}` : ""}</div>
        {med.allergy_warnings?.length > 0 && <div className="text-xs text-destructive mt-1">⚠ Allergy: {med.allergy_warnings.join(", ")}</div>}
        {med.instructions && <div className="text-xs mt-1">{med.instructions}</div>}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm">Administer</Button></DialogTrigger>
        <AdministerDialog med={med} onDone={() => { setOpen(false); onAdministered(); }} />
      </Dialog>
    </div>
  );
}

function MedicationDialog({ clientId, onSaved }: { clientId: string; onSaved: () => void }) {
  const [f, setF] = useState<any>({ name: "", dose: "", route: "oral", frequency: "", scheduled_times: "", is_prn: false, prn_reason: "", controlled_class: "", allergy_warnings: "", instructions: "", prescriber: "" });
  const save = async () => {
    if (!f.name || !f.dose || !f.frequency) { toast.error("Name, dose and frequency required"); return; }
    const payload = {
      client_id: clientId, name: f.name, dose: f.dose, route: f.route, frequency: f.frequency,
      scheduled_times: f.scheduled_times ? f.scheduled_times.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      is_prn: f.is_prn, prn_reason: f.prn_reason || null,
      controlled_class: f.controlled_class || null,
      allergy_warnings: f.allergy_warnings ? f.allergy_warnings.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      instructions: f.instructions || null, prescriber: f.prescriber || null,
    };
    const { error } = await (supabase as any).from("medications").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Medication added"); onSaved();
  };
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Add Medication</DialogTitle></DialogHeader>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Name *</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Dose *</Label><Input value={f.dose} onChange={e => setF({ ...f, dose: e.target.value })} placeholder="e.g. 500 mg" /></div>
          <div><Label>Route</Label>
            <Select value={f.route} onValueChange={v => setF({ ...f, route: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["oral","topical","injection","inhaled","sublingual","transdermal","other"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Frequency *</Label><Input value={f.frequency} onChange={e => setF({ ...f, frequency: e.target.value })} placeholder="e.g. BID, q6h" /></div>
          <div className="col-span-2"><Label>Scheduled times (comma)</Label><Input value={f.scheduled_times} onChange={e => setF({ ...f, scheduled_times: e.target.value })} placeholder="08:00, 20:00" /></div>
        </div>
        <div className="flex items-center justify-between border rounded p-2">
          <div><Label>PRN</Label><div className="text-xs text-muted-foreground">As needed</div></div>
          <Switch checked={f.is_prn} onCheckedChange={v => setF({ ...f, is_prn: v })} />
        </div>
        {f.is_prn && <div><Label>PRN reason</Label><Input value={f.prn_reason} onChange={e => setF({ ...f, prn_reason: e.target.value })} /></div>}
        <div><Label>Controlled class</Label>
          <Select value={f.controlled_class || "none"} onValueChange={v => setF({ ...f, controlled_class: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["none","II","III","IV","V"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Allergy warnings (comma)</Label><Input value={f.allergy_warnings} onChange={e => setF({ ...f, allergy_warnings: e.target.value })} /></div>
        <div><Label>Prescriber</Label><Input value={f.prescriber} onChange={e => setF({ ...f, prescriber: e.target.value })} /></div>
        <div><Label>Instructions</Label><Textarea value={f.instructions} onChange={e => setF({ ...f, instructions: e.target.value })} rows={2} /></div>
      </div>
      <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
    </DialogContent>
  );
}

function AdministerDialog({ med, onDone }: { med: any; onDone: () => void }) {
  const { user } = useAuth();
  const [status, setStatus] = useState(med.is_prn ? "prn_given" : "administered");
  const [doseGiven, setDoseGiven] = useState(med.dose);
  const [refusal, setRefusal] = useState("");
  const [notes, setNotes] = useState("");
  const [witness, setWitness] = useState("");
  const save = async () => {
    const { data: cg } = await (supabase as any).from("caregivers").select("id").eq("user_id", user?.id).maybeSingle();
    const payload: any = {
      medication_id: med.id, client_id: med.client_id, status,
      administered_at: new Date().toISOString(),
      dose_given: doseGiven, notes: notes || null,
      caregiver_id: cg?.id || null,
      refusal_reason: status === "refused" ? refusal : null,
    };
    if (med.controlled_class && witness) payload.witness_user_id = witness;
    const { error } = await (supabase as any).from("medication_administrations").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Logged"); onDone();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{med.name}</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["administered","prn_given","refused","missed","held"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Dose given</Label><Input value={doseGiven} onChange={e => setDoseGiven(e.target.value)} /></div>
        {status === "refused" && <div><Label>Refusal reason</Label><Input value={refusal} onChange={e => setRefusal(e.target.value)} /></div>}
        {med.controlled_class && <div><Label>Witness user ID (controlled)</Label><Input value={witness} onChange={e => setWitness(e.target.value)} /></div>}
        <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
      </div>
      <DialogFooter><Button onClick={save}>Log Administration</Button></DialogFooter>
    </DialogContent>
  );
}

/* ============== VITALS ============== */
function VitalsTab() {
  const clients = useClients();
  const [clientId, setClientId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState<any>({});
  const refresh = async () => {
    if (!clientId) return;
    const { data } = await (supabase as any).from("vitals").select("*").eq("client_id", clientId).order("measured_at", { ascending: false }).limit(50);
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); }, [clientId]);
  const save = async () => {
    const payload: any = { client_id: clientId };
    ["systolic","diastolic","heart_rate","respiratory_rate","spo2","blood_glucose","pain_scale"].forEach(k => { if (f[k]) payload[k] = parseInt(f[k]); });
    ["temperature","weight_lbs"].forEach(k => { if (f[k]) payload[k] = parseFloat(f[k]); });
    if (f.notes) payload.notes = f.notes;
    const { error } = await (supabase as any).from("vitals").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); setF({}); refresh();
  };
  return (
    <div className="space-y-4 mt-4">
      <div className="min-w-[220px] max-w-xs">
        <Label>Client</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {clientId && <>
        <Card>
          <CardHeader><CardTitle>Record Vitals</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[["systolic","Systolic"],["diastolic","Diastolic"],["heart_rate","HR"],["respiratory_rate","RR"],["temperature","Temp °F"],["spo2","SpO₂ %"],["weight_lbs","Weight lbs"],["blood_glucose","Glucose"],["pain_scale","Pain 0-10"]].map(([k,l]) => (
                <div key={k}><Label className="text-xs">{l}</Label><Input value={f[k] || ""} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>
              ))}
            </div>
            <div className="mt-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
            <Button className="mt-3" onClick={save}>Save</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No vitals recorded.</p>}
            {rows.map(r => (
              <div key={r.id} className="text-sm border rounded p-2">
                <div className="text-xs text-muted-foreground">{new Date(r.measured_at).toLocaleString()}</div>
                <div className="flex flex-wrap gap-3 mt-1">
                  {r.systolic && r.diastolic && <span>BP {r.systolic}/{r.diastolic}</span>}
                  {r.heart_rate && <span>HR {r.heart_rate}</span>}
                  {r.temperature && <span>T {r.temperature}°</span>}
                  {r.spo2 && <span>SpO₂ {r.spo2}%</span>}
                  {r.weight_lbs && <span>{r.weight_lbs} lb</span>}
                  {r.blood_glucose && <span>BG {r.blood_glucose}</span>}
                  {r.pain_scale != null && <span>Pain {r.pain_scale}</span>}
                </div>
                {r.notes && <div className="text-xs mt-1">{r.notes}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </>}
    </div>
  );
}

/* ============== ADLs ============== */
const ADL_ITEMS = ["Bathing","Dressing","Toileting","Transferring","Feeding","Mobility","Grooming","Mood"];
const ADL_STATUSES = ["independent","assisted","dependent","refused","n/a"];
function AdlsTab() {
  const clients = useClients();
  const [clientId, setClientId] = useState("");
  const [activities, setActivities] = useState<Record<string,string>>({});
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const refresh = async () => {
    if (!clientId) return;
    const { data } = await (supabase as any).from("adl_logs").select("*").eq("client_id", clientId).order("logged_at", { ascending: false }).limit(20);
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); }, [clientId]);
  const save = async () => {
    const { error } = await (supabase as any).from("adl_logs").insert({ client_id: clientId, activities, notes: notes || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Logged"); setActivities({}); setNotes(""); refresh();
  };
  return (
    <div className="space-y-4 mt-4">
      <div className="min-w-[220px] max-w-xs">
        <Label>Client</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {clientId && <>
        <Card>
          <CardHeader><CardTitle>Log ADLs</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ADL_ITEMS.map(item => (
                <div key={item} className="flex items-center justify-between gap-2 border rounded p-2">
                  <Label>{item}</Label>
                  <Select value={activities[item] || ""} onValueChange={v => setActivities({ ...activities, [item]: v })}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{ADL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="mt-2"><Label className="text-xs">Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
            <Button className="mt-3" onClick={save}>Save</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
            {rows.map(r => (
              <div key={r.id} className="text-sm border rounded p-2">
                <div className="text-xs text-muted-foreground">{new Date(r.logged_at).toLocaleString()}</div>
                <div className="text-xs mt-1">{Object.entries(r.activities || {}).map(([k,v]: any) => `${k}: ${v}`).join(" · ")}</div>
                {r.notes && <div className="text-xs mt-1 italic">{r.notes}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </>}
    </div>
  );
}

/* ============== INCIDENTS ============== */
function IncidentsTab() {
  const { hasAnyRole } = useAuth();
  const isManager = hasAnyRole(["admin","manager","operations_manager","supervisor"]);
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const refresh = async () => {
    let q = (supabase as any).from("incidents").select("*").order("occurred_at", { ascending: false });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    const { data } = await q;
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); }, [statusFilter]);
  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{["all","open","in_review","resolved","closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Report Incident</Button></DialogTrigger>
          <IncidentDialog onSaved={() => { setOpen(false); refresh(); }} />
        </Dialog>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No incidents.</p>}
        {rows.map(r => <IncidentCard key={r.id} row={r} isManager={isManager} refresh={refresh} />)}
      </div>
    </div>
  );
}
const INCIDENT_TYPES = ["fall","medication_error","injury","behavior","property","abuse_alleged","missed_visit","other"];
const SEVERITIES = ["low","medium","high","critical"];
function IncidentDialog({ onSaved }: { onSaved: () => void }) {
  const clients = useClients();
  const [f, setF] = useState<any>({ incident_type: "fall", severity: "low", regulatory_notify: false });
  const save = async () => {
    if (!f.narrative) { toast.error("Narrative required"); return; }
    const { error } = await (supabase as any).from("incidents").insert({
      client_id: f.client_id || null, incident_type: f.incident_type, severity: f.severity,
      narrative: f.narrative, location: f.location || null, immediate_actions: f.immediate_actions || null,
      regulatory_notify: f.regulatory_notify,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Incident reported"); onSaved();
  };
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Report Incident</DialogTitle></DialogHeader>
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        <div><Label>Client</Label>
          <Select value={f.client_id || ""} onValueChange={v => setF({ ...f, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="(optional)" /></SelectTrigger>
            <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Type</Label>
            <Select value={f.incident_type} onValueChange={v => setF({ ...f, incident_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Severity</Label>
            <Select value={f.severity} onValueChange={v => setF({ ...f, severity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SEVERITIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>Location</Label><Input value={f.location || ""} onChange={e => setF({ ...f, location: e.target.value })} /></div>
        <div><Label>Narrative *</Label><Textarea rows={4} value={f.narrative || ""} onChange={e => setF({ ...f, narrative: e.target.value })} /></div>
        <div><Label>Immediate actions taken</Label><Textarea rows={2} value={f.immediate_actions || ""} onChange={e => setF({ ...f, immediate_actions: e.target.value })} /></div>
        <div className="flex items-center justify-between border rounded p-2">
          <Label>Notify regulator</Label>
          <Switch checked={f.regulatory_notify} onCheckedChange={v => setF({ ...f, regulatory_notify: v })} />
        </div>
      </div>
      <DialogFooter><Button onClick={save}>Submit</Button></DialogFooter>
    </DialogContent>
  );
}
function IncidentCard({ row, isManager, refresh }: { row: any; isManager: boolean; refresh: () => void }) {
  const [open, setOpen] = useState(false);
  const advance = async (next: string, extra: any = {}) => {
    const payload: any = { status: next, ...extra };
    if (next === "in_review") payload.manager_id = (await supabase.auth.getUser()).data.user?.id;
    if (next === "closed") { payload.closed_at = new Date().toISOString(); payload.manager_signed_at = new Date().toISOString(); }
    const { error } = await (supabase as any).from("incidents").update(payload).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated"); refresh();
  };
  const sevColor: any = { low: "secondary", medium: "default", high: "destructive", critical: "destructive" };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-medium flex items-center gap-2">
              {row.incident_type} <Badge variant={sevColor[row.severity]}>{row.severity}</Badge>
              <Badge variant="outline">{row.status}</Badge>
              {row.regulatory_notify && <Badge variant="destructive">Regulator notify</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">{new Date(row.occurred_at).toLocaleString()}{row.location ? ` · ${row.location}` : ""}</div>
            <p className="text-sm mt-2 whitespace-pre-wrap">{row.narrative}</p>
            {row.manager_notes && <p className="text-xs mt-2 italic">Manager: {row.manager_notes}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(o => !o)}>{open ? "Hide" : "Workflow"}</Button>
        </div>
        {open && isManager && (
          <div className="mt-3 border-t pt-3 space-y-2">
            <Textarea placeholder="Manager notes / follow-up actions" defaultValue={row.manager_notes || ""}
              onBlur={e => (supabase as any).from("incidents").update({ manager_notes: e.target.value, follow_up_actions: e.target.value }).eq("id", row.id)} />
            <Textarea placeholder="Root cause" defaultValue={row.root_cause || ""}
              onBlur={e => (supabase as any).from("incidents").update({ root_cause: e.target.value }).eq("id", row.id)} />
            <div className="flex flex-wrap gap-2">
              {row.status === "open" && <Button size="sm" onClick={() => advance("in_review")}>Start review</Button>}
              {row.status !== "resolved" && row.status !== "closed" && <Button size="sm" variant="secondary" onClick={() => advance("resolved")}><Check className="h-4 w-4 mr-1" />Mark resolved</Button>}
              {row.status !== "closed" && <Button size="sm" variant="default" onClick={() => advance("closed")}>Sign off & close</Button>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ============== ASSESSMENTS ============== */
const ASSESSMENT_TYPES = ["fall_risk","braden","cognitive","nutrition","pain","custom"];
function AssessmentsTab() {
  const clients = useClients();
  const [clientId, setClientId] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState<any>({ assessment_type: "fall_risk", risk_level: "low" });
  const refresh = async () => {
    if (!clientId) return;
    const { data } = await (supabase as any).from("assessments").select("*").eq("client_id", clientId).order("performed_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); }, [clientId]);
  const save = async () => {
    const payload: any = {
      client_id: clientId, assessment_type: f.assessment_type,
      score: f.score ? parseFloat(f.score) : null,
      risk_level: f.risk_level || null,
      recommendations: f.recommendations || null,
      next_due: f.next_due || null,
      responses: f.responses_text ? { notes: f.responses_text } : {},
    };
    const { error } = await (supabase as any).from("assessments").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved"); setF({ assessment_type: "fall_risk", risk_level: "low" }); refresh();
  };
  return (
    <div className="space-y-4 mt-4">
      <div className="min-w-[220px] max-w-xs">
        <Label>Client</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {clientId && <>
        <Card>
          <CardHeader><CardTitle>New Assessment</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Type</Label>
                <Select value={f.assessment_type} onValueChange={v => setF({ ...f, assessment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSESSMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Risk level</Label>
                <Select value={f.risk_level || "low"} onValueChange={v => setF({ ...f, risk_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["low","moderate","high","severe"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Score</Label><Input value={f.score || ""} onChange={e => setF({ ...f, score: e.target.value })} /></div>
              <div><Label>Next due</Label><Input type="date" value={f.next_due || ""} onChange={e => setF({ ...f, next_due: e.target.value })} /></div>
            </div>
            <div><Label>Findings</Label><Textarea rows={3} value={f.responses_text || ""} onChange={e => setF({ ...f, responses_text: e.target.value })} /></div>
            <div><Label>Recommendations</Label><Textarea rows={2} value={f.recommendations || ""} onChange={e => setF({ ...f, recommendations: e.target.value })} /></div>
            <Button onClick={save}>Save Assessment</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No assessments yet.</p>}
            {rows.map(r => (
              <div key={r.id} className="border rounded p-2 text-sm">
                <div className="font-medium flex items-center gap-2">{r.assessment_type} <Badge>{r.risk_level || "—"}</Badge>{r.score != null && <span className="text-xs">Score: {r.score}</span>}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.performed_at).toLocaleString()}{r.next_due ? ` · next due ${r.next_due}` : ""}</div>
                {r.responses?.notes && <div className="text-xs mt-1">{r.responses.notes}</div>}
                {r.recommendations && <div className="text-xs mt-1 italic">→ {r.recommendations}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </>}
    </div>
  );
}