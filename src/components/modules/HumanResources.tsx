import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Briefcase, Calendar, FileWarning, ClipboardCheck, Star, Plus, FileText, ExternalLink, Download, Eye, PenLine, ShieldCheck, History, Package } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const MGMT: AppRole[] = ["admin", "manager", "operations_manager", "supervisor"];

const DEFAULT_ONBOARD_ITEMS = [
  "I-9 Employment Eligibility",
  "W-4 Tax Withholding",
  "Direct Deposit Form",
  "Employee Handbook Acknowledgment",
  "HIPAA Confidentiality Agreement",
  "Background Check Authorization",
  "Emergency Contact Form",
  "Job Description Sign-off",
];

interface UserRow { user_id: string; email: string | null; full_name: string | null; }
interface Employment { id: string; user_id: string; job_title: string | null; department: string | null; employment_type: string; status: string; hire_date: string | null; termination_date: string | null; termination_reason: string | null; supervisor_id: string | null; emergency_contact_name: string | null; emergency_contact_phone: string | null; notes: string | null; }
interface PTOReq { id: string; user_id: string; start_date: string; end_date: string; hours: number; request_type: string; reason: string | null; status: string; decision_notes: string | null; created_at: string; }
interface PTOBal { id: string; user_id: string; year: number; accrued_hours: number; used_hours: number; }
interface Disc { id: string; user_id: string; action_type: string; reason: string; details: string | null; issued_at: string; acknowledged_at: string | null; }
interface Review { id: string; user_id: string; reviewer_id: string | null; period_start: string; period_end: string; overall_rating: number | null; strengths: string | null; improvements: string | null; goals: string | null; status: string; }
interface OnboardItem { label: string; done: boolean; completed_at?: string }
interface Onboard { id: string; user_id: string; items: OnboardItem[]; completed_at: string | null; started_at: string; }

export function HumanResources() {
  const { user, hasAnyRole, roles } = useAuth();
  const isManager = hasAnyRole(MGMT);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [employment, setEmployment] = useState<Employment[]>([]);
  const [ptoReqs, setPtoReqs] = useState<PTOReq[]>([]);
  const [ptoBals, setPtoBals] = useState<PTOBal[]>([]);
  const [disc, setDisc] = useState<Disc[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [onboards, setOnboards] = useState<Onboard[]>([]);
  const [orphanCaregivers, setOrphanCaregivers] = useState<{ id: string; name: string; email: string | null; phone: string | null }[]>([]);

  const refresh = useCallback(async () => {
    const [u, e, pr, pb, d, r, o, oc] = await Promise.all([
      isManager ? supabase.rpc("list_users_with_roles") : Promise.resolve({ data: [] as any[] }),
      (supabase as any).from("employment_records").select("*"),
      (supabase as any).from("pto_requests").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("pto_balances").select("*"),
      (supabase as any).from("disciplinary_actions").select("*").order("issued_at", { ascending: false }),
      (supabase as any).from("performance_reviews").select("*").order("period_end", { ascending: false }),
      (supabase as any).from("onboarding_checklists").select("*"),
      isManager
        ? (supabase as any).from("caregivers").select("id, name, email, phone, user_id").is("user_id", null)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setUsers((u.data ?? []) as UserRow[]);
    setEmployment((e.data ?? []) as Employment[]);
    setPtoReqs((pr.data ?? []) as PTOReq[]);
    setPtoBals((pb.data ?? []) as PTOBal[]);
    setDisc((d.data ?? []) as Disc[]);
    setReviews((r.data ?? []) as Review[]);
    setOnboards((o.data ?? []) as Onboard[]);
    setOrphanCaregivers((oc.data ?? []) as any[]);
  }, [isManager]);

  useEffect(() => { refresh(); }, [refresh]);

  const userName = (uid: string) => users.find(u => u.user_id === uid)?.full_name || users.find(u => u.user_id === uid)?.email || uid.slice(0, 8);
  const myEmployment = employment.find(e => e.user_id === user?.id);
  const myPtoBal = ptoBals.find(b => b.user_id === user?.id && b.year === new Date().getFullYear());
  const remaining = myPtoBal ? Number(myPtoBal.accrued_hours) - Number(myPtoBal.used_hours) : 0;

  if (roles.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No role assigned.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center justify-center sm:justify-start gap-2"><Briefcase className="h-6 w-6 sm:h-8 sm:w-8" /> Human Resources</h2>
        <p className="text-muted-foreground mt-1">Employment records, time off, write-ups, reviews, and onboarding.</p>
      </div>

      {/* Personal summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">My Status</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={myEmployment?.status === "active" ? "default" : "secondary"}>{myEmployment?.status ?? "—"}</Badge>
            <p className="text-xs text-muted-foreground mt-1">{myEmployment?.job_title || "No record"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Hire Date</CardTitle></CardHeader>
          <CardContent><div className="text-lg font-semibold">{myEmployment?.hire_date || "—"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">PTO Remaining</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{remaining.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">of {myPtoBal?.accrued_hours ?? 0}h accrued</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Department</CardTitle></CardHeader>
          <CardContent><div className="text-lg font-semibold">{myEmployment?.department || "—"}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employment">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="employment"><Briefcase className="h-4 w-4 mr-1" />Employment</TabsTrigger>
          <TabsTrigger value="pto"><Calendar className="h-4 w-4 mr-1" />Time Off</TabsTrigger>
          <TabsTrigger value="discipline"><FileWarning className="h-4 w-4 mr-1" />Write-ups</TabsTrigger>
          <TabsTrigger value="reviews"><Star className="h-4 w-4 mr-1" />Reviews</TabsTrigger>
          <TabsTrigger value="onboarding"><ClipboardCheck className="h-4 w-4 mr-1" />Onboarding</TabsTrigger>
          <TabsTrigger value="library"><FileText className="h-4 w-4 mr-1" />Document Library</TabsTrigger>
          <TabsTrigger value="signatures"><PenLine className="h-4 w-4 mr-1" />E-Signatures</TabsTrigger>
          {isManager && <TabsTrigger value="audit"><History className="h-4 w-4 mr-1" />Audit Log</TabsTrigger>}
          {isManager && <TabsTrigger value="packet"><Package className="h-4 w-4 mr-1" />Audit Packet</TabsTrigger>}
        </TabsList>

        <TabsContent value="employment" className="mt-4">
          <EmploymentTab isManager={isManager} users={users} employment={employment} orphanCaregivers={orphanCaregivers} refresh={refresh} />
        </TabsContent>
        <TabsContent value="pto" className="mt-4">
          <PTOTab isManager={isManager} users={users} requests={ptoReqs} balances={ptoBals} refresh={refresh} userName={userName} myUserId={user?.id} />
        </TabsContent>
        <TabsContent value="discipline" className="mt-4">
          <DisciplineTab isManager={isManager} users={users} actions={disc} refresh={refresh} userName={userName} myUserId={user?.id} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <ReviewsTab isManager={isManager} users={users} reviews={reviews} refresh={refresh} userName={userName} myUserId={user?.id} />
        </TabsContent>
        <TabsContent value="onboarding" className="mt-4">
          <OnboardingTab isManager={isManager} users={users} onboards={onboards} refresh={refresh} userName={userName} myUserId={user?.id} />
        </TabsContent>
        <TabsContent value="library" className="mt-4">
          <DocumentLibraryTab />
        </TabsContent>
        <TabsContent value="signatures" className="mt-4">
          <SignaturesTab isManager={isManager} users={users} />
        </TabsContent>
        {isManager && (
          <TabsContent value="audit" className="mt-4">
            <AuditLogTab />
          </TabsContent>
        )}
        {isManager && (
          <TabsContent value="packet" className="mt-4">
            <AuditPacketTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ---------------- Employment ---------------- */

/* ---------------- Document Library ---------------- */
interface HRDoc {
  id: string;
  title: string;
  description: string | null;
  category: string;
  audience: string;
  reference_url: string | null;
  mandatory: boolean;
  retention_years: number | null;
  jurisdiction: string | null;
  tags: string[] | null;
  sort_order: number;
  active: boolean;
  file_path?: string | null;
}

const CAT_LABELS: Record<string, string> = {
  interview: "Interview & Hiring",
  onboarding: "Onboarding",
  compliance: "Compliance",
  policy: "Policies",
  payroll: "Payroll",
  performance: "Performance",
  separation: "Separation",
  audit: "Audit",
};

function DocumentLibraryTab() {
  const [docs, setDocs] = useState<HRDoc[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [signDoc, setSignDoc] = useState<HRDoc | null>(null);

  useEffect(() => {
    (supabase as any)
      .from("hr_document_templates")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }: { data: HRDoc[] | null }) => setDocs(data ?? []));
  }, []);

  const filtered = docs.filter(d =>
    (cat === "all" || d.category === cat) &&
    (q === "" || d.title.toLowerCase().includes(q.toLowerCase()) || (d.description ?? "").toLowerCase().includes(q.toLowerCase()))
  );

  const grouped = filtered.reduce<Record<string, HRDoc[]>>((acc, d) => {
    (acc[d.category] ||= []).push(d); return acc;
  }, {});

  const openFile = async (d: HRDoc, action: "view" | "download") => {
    if (!d.file_path) {
      if (d.reference_url) window.open(d.reference_url, "_blank");
      return;
    }
    const { data, error } = await (supabase as any).storage.from("documents").createSignedUrl(d.file_path, 60);
    if (error || !data?.signedUrl) { toast.error("Could not open file"); return; }
    await (supabase as any).from("hr_document_audit_log").insert({
      document_id: d.id, document_title: d.title, action,
      metadata: { file_path: d.file_path },
      user_agent: navigator.userAgent.slice(0, 200),
    });
    if (action === "download") {
      const a = document.createElement("a");
      a.href = data.signedUrl; a.download = d.title.replace(/\s+/g, "_") + ".pdf";
      document.body.appendChild(a); a.click(); a.remove();
    } else {
      window.open(data.signedUrl, "_blank");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>HR Document Library</CardTitle>
        <CardDescription>
          Standard interview, onboarding, compliance, and audit documents. External links open authoritative sources (USCIS, IRS, OSHA, CMS, HHS).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-4">
          <Input placeholder="Search documents…" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CAT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground self-center">{filtered.length} of {docs.length}</div>
        </div>
        {Object.keys(grouped).sort().map(c => (
          <div key={c} className="mb-6">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">{CAT_LABELS[c] ?? c}</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {grouped[c].map(d => (
                <div key={d.id} className="border rounded-md p-3 hover:bg-muted/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{d.title}</div>
                    <div className="flex gap-1 shrink-0">
                      {d.mandatory && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                      {d.jurisdiction && <Badge variant="outline" className="text-[10px]">{d.jurisdiction}</Badge>}
                    </div>
                  </div>
                  {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {d.retention_years != null && <span>Retain: {d.retention_years}y</span>}
                    {d.reference_url && (
                      <a href={d.reference_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Reference
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {d.file_path && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openFile(d, "view")}><Eye className="h-3 w-3 mr-1" />View</Button>
                        <Button size="sm" variant="outline" onClick={() => openFile(d, "download")}><Download className="h-3 w-3 mr-1" />Download</Button>
                      </>
                    )}
                    <Button size="sm" onClick={() => setSignDoc(d)}><PenLine className="h-3 w-3 mr-1" />Sign</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
      {signDoc && <SignDocumentDialog doc={signDoc} onClose={() => setSignDoc(null)} />}
    </Card>
  );
}

function OrphanCaregiversPanel({ orphans, refresh }: { orphans: { id: string; name: string; email: string | null; phone: string | null }[]; refresh: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const create = async (c: { id: string; name: string; email: string | null }) => {
    if (!c.email) return toast.error("Add an email to this caregiver first");
    setBusyId(c.id);
    const { data, error } = await supabase.functions.invoke("create-caregiver-account", {
      body: { caregiver_id: c.id },
    });
    setBusyId(null);
    if (error || (data as any)?.error) {
      return toast.error((data as any)?.error || error?.message || "Failed to create account");
    }
    toast.success(`Invite sent to ${c.email}${(data as any)?.trainings_assigned ? ` · ${(data as any).trainings_assigned} trainings assigned` : ""}`);
    refresh();
  };
  return (
    <Card className="border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="text-base">Caregivers without a user account ({orphans.length})</CardTitle>
        <CardDescription>Create a sign-in account to link an employment record, send an invite email, and auto-assign required trainings.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead></TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {orphans.map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.email || <span className="text-muted-foreground italic">no email</span>}</TableCell>
                <TableCell>{c.phone || "—"}</TableCell>
                <TableCell><Badge variant="outline" className="border-amber-500 text-amber-700">Needs account</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" disabled={!c.email || busyId === c.id} onClick={() => create(c)}>
                    {busyId === c.id ? "Creating…" : "Create account"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function EmploymentTab({ isManager, users, employment, orphanCaregivers, refresh }: { isManager: boolean; users: UserRow[]; employment: Employment[]; orphanCaregivers: { id: string; name: string; email: string | null; phone: string | null }[]; refresh: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Employment>>({ employment_type: "full_time", status: "active" });

  const save = async () => {
    if (!form.user_id) return toast.error("Select a user");
    const existing = employment.find(e => e.user_id === form.user_id);
    const payload = { ...form };
    const res = existing
      ? await (supabase as any).from("employment_records").update(payload).eq("id", existing.id)
      : await (supabase as any).from("employment_records").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved"); setOpen(false); setForm({ employment_type: "full_time", status: "active" }); refresh();
  };

  return (
    <div className="space-y-6">
    {isManager && orphanCaregivers.length > 0 && (
      <OrphanCaregiversPanel orphans={orphanCaregivers} refresh={refresh} />
    )}
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Employment Records</CardTitle><CardDescription>Hire info, status, department</CardDescription></div>
        {isManager && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Add / Edit</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Employment Record</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Employee</Label>
                  <Select value={form.user_id} onValueChange={(v) => {
                    const ex = employment.find(e => e.user_id === v);
                    setForm(ex ? { ...ex } : { user_id: v, employment_type: "full_time", status: "active" });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{users.map(u => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Job Title</Label><Input value={form.job_title ?? ""} onChange={e => setForm({ ...form, job_title: e.target.value })} /></div>
                  <div><Label>Department</Label><Input value={form.department ?? ""} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
                  <div><Label>Type</Label>
                    <Select value={form.employment_type} onValueChange={v => setForm({ ...form, employment_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full-time</SelectItem>
                        <SelectItem value="part_time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="per_diem">Per-diem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Hire Date</Label><Input type="date" value={form.hire_date ?? ""} onChange={e => setForm({ ...form, hire_date: e.target.value })} /></div>
                  <div><Label>Termination Date</Label><Input type="date" value={form.termination_date ?? ""} onChange={e => setForm({ ...form, termination_date: e.target.value })} /></div>
                  <div><Label>Emergency Contact</Label><Input value={form.emergency_contact_name ?? ""} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} /></div>
                  <div><Label>Emergency Phone</Label><Input value={form.emergency_contact_phone ?? ""} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Title</TableHead><TableHead>Dept</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Hired</TableHead></TableRow></TableHeader>
          <TableBody>
            {employment.map(e => {
              const u = users.find(x => x.user_id === e.user_id);
              return (
                <TableRow key={e.id}>
                  <TableCell>{u?.full_name || u?.email || e.user_id.slice(0, 8)}</TableCell>
                  <TableCell>{e.job_title || "—"}</TableCell>
                  <TableCell>{e.department || "—"}</TableCell>
                  <TableCell className="capitalize">{e.employment_type.replace("_", " ")}</TableCell>
                  <TableCell><Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                  <TableCell>{e.hire_date || "—"}</TableCell>
                </TableRow>
              );
            })}
            {employment.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No records yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </div>
  );
}

/* ---------------- PTO ---------------- */
function PTOTab({ isManager, users, requests, balances, refresh, userName, myUserId }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ request_type: "pto", hours: 8 });

  const submit = async () => {
    if (!form.start_date || !form.end_date) return toast.error("Dates required");
    const { error } = await (supabase as any).from("pto_requests").insert({ ...form, user_id: myUserId });
    if (error) return toast.error(error.message);
    toast.success("Request submitted"); setOpen(false); setForm({ request_type: "pto", hours: 8 }); refresh();
  };

  const decide = async (id: string, status: "approved" | "denied", notes = "") => {
    const req = requests.find((r: PTOReq) => r.id === id);
    const { error } = await (supabase as any).from("pto_requests").update({
      status, decision_notes: notes, decided_at: new Date().toISOString(), decided_by: myUserId
    }).eq("id", id);
    if (error) return toast.error(error.message);
    if (status === "approved" && req) {
      const bal = balances.find((b: PTOBal) => b.user_id === req.user_id && b.year === new Date().getFullYear());
      if (bal) {
        await (supabase as any).from("pto_balances").update({ used_hours: Number(bal.used_hours) + Number(req.hours) }).eq("id", bal.id);
      }
    }
    toast.success(status); refresh();
  };

  const visible = isManager ? requests : requests.filter((r: PTOReq) => r.user_id === myUserId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Time Off Requests</CardTitle><CardDescription>Submit and approve PTO</CardDescription></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Request Time Off</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Time Off Request</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start</Label><Input type="date" value={form.start_date ?? ""} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>End</Label><Input type="date" value={form.end_date ?? ""} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                <div><Label>Hours</Label><Input type="number" value={form.hours ?? 0} onChange={e => setForm({ ...form, hours: Number(e.target.value) })} /></div>
                <div><Label>Type</Label>
                  <Select value={form.request_type} onValueChange={v => setForm({ ...form, request_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pto">PTO</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="bereavement">Bereavement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Reason</Label><Textarea value={form.reason ?? ""} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={submit}>Submit</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Dates</TableHead><TableHead>Hours</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {visible.map((r: PTOReq) => (
              <TableRow key={r.id}>
                <TableCell>{userName(r.user_id)}</TableCell>
                <TableCell>{r.start_date} → {r.end_date}</TableCell>
                <TableCell>{r.hours}</TableCell>
                <TableCell className="capitalize">{r.request_type}</TableCell>
                <TableCell><Badge variant={r.status === "approved" ? "default" : r.status === "denied" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell>
                  {isManager && r.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => decide(r.id, "approved")}>Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => decide(r.id, "denied")}>Deny</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No requests</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------------- Discipline ---------------- */
function DisciplineTab({ isManager, users, actions, refresh, userName, myUserId }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ action_type: "verbal" });

  const save = async () => {
    if (!form.user_id || !form.reason) return toast.error("User and reason required");
    const { error } = await (supabase as any).from("disciplinary_actions").insert({ ...form, issued_by: myUserId });
    if (error) return toast.error(error.message);
    toast.success("Issued"); setOpen(false); setForm({ action_type: "verbal" }); refresh();
  };

  const acknowledge = async (id: string) => {
    const { error } = await (supabase as any).from("disciplinary_actions").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Acknowledged"); refresh();
  };

  const visible = isManager ? actions : actions.filter((a: Disc) => a.user_id === myUserId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Disciplinary Actions</CardTitle><CardDescription>Verbal, written, final & termination notices</CardDescription></div>
        {isManager && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Write-up</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Disciplinary Action</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Employee</Label>
                  <Select value={form.user_id} onValueChange={v => setForm({ ...form, user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{users.map((u: UserRow) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Type</Label>
                  <Select value={form.action_type} onValueChange={v => setForm({ ...form, action_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="verbal">Verbal Warning</SelectItem>
                      <SelectItem value="written">Written Warning</SelectItem>
                      <SelectItem value="final">Final Warning</SelectItem>
                      <SelectItem value="suspension">Suspension</SelectItem>
                      <SelectItem value="termination">Termination</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Reason</Label><Input value={form.reason ?? ""} onChange={e => setForm({ ...form, reason: e.target.value })} /></div>
                <div><Label>Details</Label><Textarea value={form.details ?? ""} onChange={e => setForm({ ...form, details: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Issue</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead>Issued</TableHead><TableHead>Acknowledged</TableHead></TableRow></TableHeader>
          <TableBody>
            {visible.map((a: Disc) => (
              <TableRow key={a.id}>
                <TableCell>{userName(a.user_id)}</TableCell>
                <TableCell><Badge variant={a.action_type === "termination" ? "destructive" : "secondary"} className="capitalize">{a.action_type}</Badge></TableCell>
                <TableCell className="max-w-xs truncate">{a.reason}</TableCell>
                <TableCell>{new Date(a.issued_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {a.acknowledged_at ? new Date(a.acknowledged_at).toLocaleDateString() :
                    a.user_id === myUserId ? <Button size="sm" variant="outline" onClick={() => acknowledge(a.id)}>Acknowledge</Button> : <span className="text-muted-foreground text-sm">Pending</span>}
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No actions</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------------- Reviews ---------------- */
function ReviewsTab({ isManager, users, reviews, refresh, userName, myUserId }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ status: "draft", overall_rating: 3 });

  const save = async () => {
    if (!form.user_id || !form.period_start || !form.period_end) return toast.error("Required fields missing");
    const { error } = await (supabase as any).from("performance_reviews").insert({ ...form, reviewer_id: myUserId });
    if (error) return toast.error(error.message);
    toast.success("Saved"); setOpen(false); setForm({ status: "draft", overall_rating: 3 }); refresh();
  };

  const sign = async (id: string) => {
    const { error } = await (supabase as any).from("performance_reviews").update({ employee_signed_at: new Date().toISOString(), status: "acknowledged" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Signed"); refresh();
  };

  const visible = isManager ? reviews : reviews.filter((r: Review) => r.user_id === myUserId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Performance Reviews</CardTitle><CardDescription>Periodic evaluations & sign-offs</CardDescription></div>
        {isManager && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New Review</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Performance Review</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Employee</Label>
                  <Select value={form.user_id} onValueChange={v => setForm({ ...form, user_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{users.map((u: UserRow) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name || u.email}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Period Start</Label><Input type="date" value={form.period_start ?? ""} onChange={e => setForm({ ...form, period_start: e.target.value })} /></div>
                  <div><Label>Period End</Label><Input type="date" value={form.period_end ?? ""} onChange={e => setForm({ ...form, period_end: e.target.value })} /></div>
                </div>
                <div><Label>Overall Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.overall_rating ?? 3} onChange={e => setForm({ ...form, overall_rating: Number(e.target.value) })} /></div>
                <div><Label>Strengths</Label><Textarea value={form.strengths ?? ""} onChange={e => setForm({ ...form, strengths: e.target.value })} /></div>
                <div><Label>Areas for Improvement</Label><Textarea value={form.improvements ?? ""} onChange={e => setForm({ ...form, improvements: e.target.value })} /></div>
                <div><Label>Goals</Label><Textarea value={form.goals ?? ""} onChange={e => setForm({ ...form, goals: e.target.value })} /></div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visible.map((r: Review) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{userName(r.user_id)}</div>
                  <div className="text-sm text-muted-foreground">{r.period_start} → {r.period_end}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < (r.overall_rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={r.status === "acknowledged" ? "default" : "secondary"}>{r.status}</Badge>
                  {r.user_id === myUserId && r.status === "submitted" && (
                    <Button size="sm" onClick={() => sign(r.id)}>Sign & Acknowledge</Button>
                  )}
                </div>
              </div>
              {r.strengths && <div className="mt-3 text-sm"><span className="font-medium">Strengths:</span> {r.strengths}</div>}
              {r.improvements && <div className="mt-1 text-sm"><span className="font-medium">Improvements:</span> {r.improvements}</div>}
              {r.goals && <div className="mt-1 text-sm"><span className="font-medium">Goals:</span> {r.goals}</div>}
            </Card>
          ))}
          {visible.length === 0 && <div className="text-center text-muted-foreground py-8">No reviews yet</div>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Onboarding ---------------- */
function OnboardingTab({ isManager, users, onboards, refresh, userName, myUserId }: any) {
  const start = async (uid: string) => {
    const items = DEFAULT_ONBOARD_ITEMS.map(label => ({ label, done: false }));
    const { error } = await (supabase as any).from("onboarding_checklists").insert({ user_id: uid, items });
    if (error) return toast.error(error.message);
    toast.success("Onboarding started"); refresh();
  };

  const toggle = async (o: Onboard, idx: number) => {
    const items = [...o.items];
    items[idx] = { ...items[idx], done: !items[idx].done, completed_at: !items[idx].done ? new Date().toISOString() : undefined };
    const allDone = items.every(i => i.done);
    const { error } = await (supabase as any).from("onboarding_checklists").update({
      items, completed_at: allDone ? new Date().toISOString() : null
    }).eq("id", o.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const visible = isManager ? onboards : onboards.filter((o: Onboard) => o.user_id === myUserId);
  const usersWithoutOnboard = isManager ? users.filter((u: UserRow) => !onboards.find((o: Onboard) => o.user_id === u.user_id)) : [];

  return (
    <div className="space-y-4">
      {isManager && usersWithoutOnboard.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Start Onboarding</CardTitle><CardDescription>Users without an onboarding checklist</CardDescription></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {usersWithoutOnboard.map((u: UserRow) => (
                <Button key={u.user_id} size="sm" variant="outline" onClick={() => start(u.user_id)}>
                  <Plus className="h-3 w-3 mr-1" />{u.full_name || u.email}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {visible.map((o: Onboard) => {
        const done = o.items.filter(i => i.done).length;
        const pct = o.items.length ? Math.round((done / o.items.length) * 100) : 0;
        return (
          <Card key={o.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div><CardTitle>{userName(o.user_id)}</CardTitle><CardDescription>Started {new Date(o.started_at).toLocaleDateString()}</CardDescription></div>
                <Badge variant={o.completed_at ? "default" : "secondary"}>{done}/{o.items.length} • {pct}%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {o.items.map((item, idx) => (
                  <label key={idx} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={item.done} onChange={() => toggle(o, idx)}
                      disabled={!isManager && o.user_id !== myUserId} />
                    <span className={item.done ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {visible.length === 0 && <div className="text-center text-muted-foreground py-8">No onboarding checklists</div>}
    </div>
  );
}

/* ---------------- E-Signature Dialog ---------------- */
function SignDocumentDialog({ doc, onClose }: { doc: HRDoc; onClose: () => void }) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [typedName, setTypedName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#111";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const start = (e: React.PointerEvent) => { drawing.current = true; const p = pos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const p = pos(e); const ctx = canvasRef.current!.getContext("2d")!; ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const end = () => { drawing.current = false; };
  const clear = () => { const c = canvasRef.current!; const ctx = c.getContext("2d")!; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); };

  const submit = async () => {
    if (!user || !typedName.trim()) { toast.error("Type your full name"); return; }
    setSaving(true);
    try {
      const c = canvasRef.current!;
      const blob: Blob = await new Promise((res) => c.toBlob(b => res(b!), "image/png")!);
      const path = `signatures/${user.id}/${doc.id}-${Date.now()}.png`;
      const up = await (supabase as any).storage.from("documents").upload(path, blob, { contentType: "image/png", upsert: false });
      if (up.error) throw up.error;
      const ins = await (supabase as any).from("hr_document_signatures").insert({
        document_id: doc.id, document_title: doc.title,
        signer_id: user.id, signer_email: user.email,
        status: "signed", signed_at: new Date().toISOString(),
        signature_image_path: path, signature_typed_name: typedName.trim(),
        user_agent: navigator.userAgent.slice(0, 200),
      });
      if (ins.error) throw ins.error;
      await (supabase as any).from("hr_document_audit_log").insert({
        document_id: doc.id, document_title: doc.title, action: "sign",
        metadata: { signature_path: path, typed_name: typedName.trim() },
        user_agent: navigator.userAgent.slice(0, 200),
      });
      toast.success("Document signed");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to sign");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Sign: {doc.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">By signing below, I acknowledge that I have read and agree to this document.</p>
          <div>
            <Label>Full legal name</Label>
            <Input value={typedName} onChange={e => setTypedName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <Label>Signature</Label>
            <div className="border rounded-md bg-white">
              <canvas
                ref={canvasRef} width={600} height={180}
                className="w-full touch-none cursor-crosshair"
                onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={clear} className="mt-1">Clear</Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Signing…" : "Sign & Submit"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Signatures Tab ---------------- */
interface SigRow { id: string; document_id: string | null; document_title: string | null; signer_id: string; signer_email: string | null; status: string; requested_at: string; signed_at: string | null; signature_image_path: string | null; signature_typed_name: string | null; }

function SignaturesTab({ isManager, users }: { isManager: boolean; users: UserRow[] }) {
  const [rows, setRows] = useState<SigRow[]>([]);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    const { data } = await (supabase as any).from("hr_document_signatures").select("*").order("requested_at", { ascending: false }).limit(500);
    setRows((data ?? []) as SigRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const userName = (uid: string) => users.find(u => u.user_id === uid)?.full_name || users.find(u => u.user_id === uid)?.email || uid.slice(0, 8);
  const filtered = rows.filter(r => filter === "all" || r.status === filter);

  const viewSig = async (path: string | null) => {
    if (!path) return;
    const { data } = await (supabase as any).storage.from("documents").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> E-Signature Records</CardTitle>
        <CardDescription>{isManager ? "All signature requests and completed signatures across staff." : "Your signed documents and pending requests."}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          {["all", "pending", "signed", "declined", "expired"].map(s => (
            <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>{s}</Button>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              {isManager && <TableHead>Signer</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Signed</TableHead>
              <TableHead>Typed name</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.document_title}</TableCell>
                {isManager && <TableCell>{userName(r.signer_id)}</TableCell>}
                <TableCell><Badge variant={r.status === "signed" ? "default" : r.status === "declined" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell className="text-xs">{new Date(r.requested_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-xs">{r.signed_at ? new Date(r.signed_at).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-xs">{r.signature_typed_name ?? "—"}</TableCell>
                <TableCell>
                  {r.signature_image_path && <Button size="sm" variant="ghost" onClick={() => viewSig(r.signature_image_path)}><Eye className="h-3 w-3" /></Button>}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={isManager ? 7 : 6} className="text-center text-muted-foreground py-6">No records</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------------- Audit Log Tab ---------------- */
interface AuditRow { id: string; document_id: string | null; document_title: string | null; user_id: string; action: string; metadata: any; created_at: string; }

function AuditLogTab() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [action, setAction] = useState<string>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    (supabase as any).from("hr_document_audit_log").select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }: any) => setRows((data ?? []) as AuditRow[]));
  }, []);

  const filtered = rows.filter(r =>
    (action === "all" || r.action === action) &&
    (q === "" || (r.document_title ?? "").toLowerCase().includes(q.toLowerCase()) || r.user_id.includes(q))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Document Audit Log</CardTitle>
        <CardDescription>Every view, download, signature, update, and deletion is recorded with user ID and timestamp.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Input placeholder="Search document or user…" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all", "view", "download", "sign", "request_signature", "update", "delete", "upload"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground self-center">{filtered.length} events</div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                <TableCell className="text-sm">{r.document_title ?? "—"}</TableCell>
                <TableCell className="text-xs font-mono">{r.user_id.slice(0, 8)}…</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{r.metadata ? JSON.stringify(r.metadata) : ""}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No events yet</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ---------------- Audit Packet Tab ---------------- */
function AuditPacketTab() {
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [signatures, setSignatures] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const fromIso = new Date(from + "T00:00:00").toISOString();
    const toIso = new Date(to + "T23:59:59").toISOString();
    const [{ data: sigs }, { data: aud }] = await Promise.all([
      (supabase as any).from("hr_document_signatures").select("*")
        .gte("requested_at", fromIso).lte("requested_at", toIso)
        .order("requested_at", { ascending: false }),
      (supabase as any).from("hr_document_audit_log").select("*")
        .gte("created_at", fromIso).lte("created_at", toIso)
        .order("created_at", { ascending: false }),
    ]);
    setSignatures((sigs ?? []) as any[]);
    setAudits((aud ?? []) as any[]);
    const signedIds = new Set<string>(((sigs ?? []) as any[]).filter((s: any) => s.status === "signed").map((s: any) => s.id));
    setSelected(signedIds);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const generate = async () => {
    setBusy(true);
    try {
      const pdf = new jsPDF({ unit: "pt", format: "letter" });
      const W = pdf.internal.pageSize.getWidth();

      // Cover
      pdf.setFontSize(20); pdf.text("Audit Packet", W / 2, 80, { align: "center" });
      pdf.setFontSize(11);
      pdf.text(`Date range: ${from}  to  ${to}`, W / 2, 110, { align: "center" });
      pdf.text(`Generated: ${new Date().toLocaleString()}`, W / 2, 128, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(`Signed documents included: ${selected.size}`, 60, 170);
      pdf.text(`Audit log events: ${audits.length}`, 60, 188);

      // Signed documents summary table
      pdf.addPage();
      pdf.setFontSize(14); pdf.text("Signed Documents", 60, 60);
      const sigRows = signatures.filter(s => selected.has(s.id)).map(s => [
        s.document_title ?? "—",
        s.signature_typed_name ?? "—",
        s.status,
        s.signed_at ? new Date(s.signed_at).toLocaleString() : "—",
        s.signer_id?.slice(0, 8) ?? "",
      ]);
      autoTable(pdf, {
        startY: 80,
        head: [["Document", "Typed Name", "Status", "Signed At", "Signer ID"]],
        body: sigRows.length ? sigRows : [["No signatures selected", "", "", "", ""]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 64, 175] },
      });

      // Audit log table
      pdf.addPage();
      pdf.setFontSize(14); pdf.text("Document Audit Log", 60, 60);
      autoTable(pdf, {
        startY: 80,
        head: [["Timestamp", "Action", "Document", "User ID"]],
        body: audits.length
          ? audits.map(a => [
              new Date(a.created_at).toLocaleString(),
              a.action,
              a.document_title ?? "—",
              a.user_id?.slice(0, 8) ?? "",
            ])
          : [["No events in range", "", "", ""]],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 64, 175] },
      });

      // Embed signature images for selected signed docs
      for (const s of signatures.filter(x => selected.has(x.id))) {
        if (!s.signature_image_path) continue;
        try {
          const { data } = await (supabase as any).storage.from("documents")
            .createSignedUrl(s.signature_image_path, 120);
          if (!data?.signedUrl) continue;
          const blob = await (await fetch(data.signedUrl)).blob();
          const dataUrl: string = await new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.onerror = rej;
            r.readAsDataURL(blob);
          });
          pdf.addPage();
          pdf.setFontSize(13);
          pdf.text(`Signed: ${s.document_title ?? ""}`, 60, 60);
          pdf.setFontSize(9);
          pdf.text(`Signer: ${s.signature_typed_name ?? ""}   ID: ${s.signer_id?.slice(0, 8) ?? ""}`, 60, 78);
          pdf.text(`Signed at: ${s.signed_at ? new Date(s.signed_at).toLocaleString() : ""}`, 60, 92);
          const fmt = (dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG") as "PNG" | "JPEG";
          pdf.addImage(dataUrl, fmt, 60, 110, 400, 160);
        } catch { /* skip */ }
      }

      // Footer page numbers
      const total = pdf.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(`Page ${i} of ${total}`, W - 60, pdf.internal.pageSize.getHeight() - 24, { align: "right" });
      }

      const filename = `Audit_Packet_${from}_to_${to}.pdf`;
      pdf.save(filename);

      await (supabase as any).from("hr_document_audit_log").insert({
        action: "download", document_title: filename,
        metadata: { type: "audit_packet", from, to, signatures: selected.size, events: audits.length },
      });
      toast.success("Audit packet generated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate packet");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Audit Packet</CardTitle>
        <CardDescription>One-click bundled PDF: cover sheet, selected signed documents, signature images, and the full audit log for the date range.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div><Label>From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          <Button variant="outline" onClick={load}>Refresh</Button>
          <Button onClick={generate} disabled={busy}>
            <Download className="h-4 w-4 mr-1" />{busy ? "Building…" : "Generate packet PDF"}
          </Button>
          <div className="text-sm text-muted-foreground">
            {selected.size} signature(s) selected · {audits.length} audit event(s) in range
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Signed documents in range — select to include</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Typed name</TableHead>
                <TableHead>Signed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signatures.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                  </TableCell>
                  <TableCell className="text-sm">{s.document_title ?? "—"}</TableCell>
                  <TableCell><Badge variant={s.status === "signed" ? "default" : "secondary"}>{s.status}</Badge></TableCell>
                  <TableCell className="text-xs">{s.signature_typed_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{s.signed_at ? new Date(s.signed_at).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
              {signatures.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No signature requests in this range</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}