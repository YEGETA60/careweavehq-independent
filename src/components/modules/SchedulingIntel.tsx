import { useEffect, useMemo, useState } from "react";
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
import { toast } from "sonner";
import { CalendarClock, Megaphone, Timer, MapPin, Plus, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function SchedulingIntel() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Scheduling Intelligence</h1>
        <p className="text-muted-foreground text-sm">Availability, open shifts, overtime forecast and geofence setup.</p>
      </div>
      <LegalDisclaimer variant="schedulingAi" />
      <Tabs defaultValue="shifts" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="shifts"><Megaphone className="h-4 w-4 mr-1" />Open Shifts</TabsTrigger>
          <TabsTrigger value="availability"><CalendarClock className="h-4 w-4 mr-1" />Availability</TabsTrigger>
          <TabsTrigger value="overtime"><Timer className="h-4 w-4 mr-1" />OT Forecast</TabsTrigger>
          <TabsTrigger value="geofence"><MapPin className="h-4 w-4 mr-1" />Geofence</TabsTrigger>
        </TabsList>
        <TabsContent value="shifts"><OpenShiftsTab /></TabsContent>
        <TabsContent value="availability"><AvailabilityTab /></TabsContent>
        <TabsContent value="overtime"><OvertimeTab /></TabsContent>
        <TabsContent value="geofence"><GeofenceTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============== OPEN SHIFTS ============== */
function OpenShiftsTab() {
  const { user, hasAnyRole } = useAuth();
  const isManager = hasAnyRole(["admin","scheduler","manager","operations_manager","supervisor"]);
  const [rows, setRows] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [myCgId, setMyCgId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("open");
  const [matchShift, setMatchShift] = useState<any | null>(null);

  const refresh = async () => {
    let q = (supabase as any).from("open_shifts").select("*").order("date").order("start_time");
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); }, [filter]);
  useEffect(() => {
    (supabase as any).from("clients").select("id,name").order("name").then(({ data }: any) => setClients(data ?? []));
    if (user) (supabase as any).from("caregivers").select("id").eq("user_id", user.id).maybeSingle().then(({ data }: any) => setMyCgId(data?.id || null));
  }, [user]);

  const claim = async (id: string) => {
    if (!myCgId) { toast.error("No caregiver profile linked to your account"); return; }
    const { error } = await (supabase as any).from("open_shifts").update({ status: "claimed", claimed_by: myCgId, claimed_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Claimed — pending approval"); refresh(); }
  };
  const approve = async (s: any) => {
    // Create the visit + mark filled
    const { data: visit, error: vErr } = await (supabase as any).from("visits").insert({
      client_id: s.client_id, caregiver_id: s.claimed_by, date: s.date,
      start_time: s.start_time, end_time: s.end_time, status: "Scheduled",
      skills_required: s.skills_required, certifications_required: s.certifications_required,
    }).select().single();
    if (vErr) { toast.error(vErr.message); return; }
    await (supabase as any).from("open_shifts").update({ status: "filled", approved_by: user?.id, approved_at: new Date().toISOString(), visit_id: visit.id }).eq("id", s.id);
    toast.success("Visit created"); refresh();
  };
  const cancel = async (id: string) => {
    const { error } = await (supabase as any).from("open_shifts").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Label>Status</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{["all","open","claimed","filled","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {isManager && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Post Shift</Button></DialogTrigger>
            <PostShiftDialog clients={clients} onSaved={() => { setOpen(false); refresh(); }} />
          </Dialog>
        )}
      </div>
      <div className="grid gap-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No shifts.</p>}
        {rows.map(s => {
          const client = clients.find(c => c.id === s.client_id);
          return (
            <Card key={s.id}>
              <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{client?.name || "—"} · {s.date} {s.start_time}–{s.end_time}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                    <Badge variant="outline">{s.status}</Badge>
                    {s.hourly_rate && <span>${s.hourly_rate}/hr</span>}
                    {s.skills_required?.length > 0 && <span>Skills: {s.skills_required.join(", ")}</span>}
                    {s.certifications_required?.length > 0 && <span>Certs: {s.certifications_required.join(", ")}</span>}
                  </div>
                  {s.notes && <p className="text-sm mt-2">{s.notes}</p>}
                </div>
                <div className="flex gap-2">
                  {s.status === "open" && myCgId && <Button size="sm" onClick={() => claim(s.id)}>Claim</Button>}
                  {s.status === "open" && isManager && (
                    <Button size="sm" variant="secondary" onClick={() => setMatchShift(s)}>
                      <Sparkles className="h-4 w-4 mr-1" />AI Match
                    </Button>
                  )}
                  {s.status === "claimed" && isManager && <Button size="sm" onClick={() => approve(s)}><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>}
                  {(s.status === "open" || s.status === "claimed") && isManager && <Button size="sm" variant="outline" onClick={() => cancel(s.id)}>Cancel</Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <AiMatchDialog
        shift={matchShift}
        onClose={() => setMatchShift(null)}
        onAssigned={() => { setMatchShift(null); refresh(); }}
      />
    </div>
  );
}

function AiMatchDialog({ shift, onClose, onAssigned }: { shift: any | null; onClose: () => void; onAssigned: () => void }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    if (!shift) { setData(null); return; }
    setLoading(true);
    supabase.functions
      .invoke("ai-shift-matcher", { body: { shift_id: shift.id } })
      .then(({ data, error }) => {
        if (error) toast.error(error.message || "AI match failed");
        else setData(data);
      })
      .finally(() => setLoading(false));
  }, [shift?.id]);

  const assign = async (caregiverId: string) => {
    if (!shift) return;
    setAssigning(caregiverId);
    const { data: visit, error: vErr } = await (supabase as any).from("visits").insert({
      client_id: shift.client_id, caregiver_id: caregiverId, date: shift.date,
      start_time: shift.start_time, end_time: shift.end_time, status: "Scheduled",
      skills_required: shift.skills_required, certifications_required: shift.certifications_required,
    }).select().single();
    if (vErr) { toast.error(vErr.message); setAssigning(null); return; }
    await (supabase as any).from("open_shifts").update({
      status: "filled", claimed_by: caregiverId, claimed_at: new Date().toISOString(),
      approved_at: new Date().toISOString(), visit_id: visit.id,
    }).eq("id", shift.id);
    toast.success("Caregiver assigned");
    setAssigning(null);
    onAssigned();
  };

  const recBadge = (r?: string) => {
    switch (r) {
      case "best_fit": return <Badge className="bg-primary">Best fit</Badge>;
      case "good_fit": return <Badge variant="secondary">Good fit</Badge>;
      case "backup": return <Badge variant="outline">Backup</Badge>;
      case "not_recommended": return <Badge variant="destructive">Not recommended</Badge>;
      default: return null;
    }
  };

  return (
    <Dialog open={!!shift} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />AI Caregiver Match
          </DialogTitle>
        </DialogHeader>
        {loading && (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />Analyzing caregivers…
          </div>
        )}
        {!loading && data && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="text-xs text-muted-foreground">
              {data.shift?.client_name} · {data.shift?.date} {data.shift?.start_time}–{data.shift?.end_time} ({data.shift?.duration_hours}h)
            </div>
            {(data.candidates ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No eligible caregivers found.</p>
            )}
            {(data.candidates ?? []).map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {c.name} {recBadge(c.recommendation)}
                      </div>
                      {c.rationale && <p className="text-sm text-muted-foreground mt-1">{c.rationale}</p>}
                    </div>
                    <Button size="sm" disabled={assigning === c.id || c.day_conflict || c.on_time_off} onClick={() => assign(c.id)}>
                      {assigning === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">Skills {c.skills_match}%</Badge>
                    <Badge variant="outline">Certs {c.certs_match}%</Badge>
                    <Badge variant="outline">Week {c.projected_week_hours}h</Badge>
                    {c.ot_risk > 0 && <Badge variant="destructive">OT risk {c.ot_risk}%</Badge>}
                    {c.in_availability && <Badge variant="secondary">In availability</Badge>}
                    {c.day_conflict && <Badge variant="destructive">Day conflict</Badge>}
                    {c.on_time_off && <Badge variant="destructive">Time off</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
function PostShiftDialog({ clients, onSaved }: { clients: any[]; onSaved: () => void }) {
  const [f, setF] = useState<any>({ date: "", start_time: "09:00", end_time: "17:00", skills_required: "", certifications_required: "", hourly_rate: "" });
  const save = async () => {
    if (!f.client_id || !f.date) { toast.error("Client and date required"); return; }
    const { error } = await (supabase as any).from("open_shifts").insert({
      client_id: f.client_id, date: f.date, start_time: f.start_time, end_time: f.end_time,
      skills_required: f.skills_required ? f.skills_required.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      certifications_required: f.certifications_required ? f.certifications_required.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
      hourly_rate: f.hourly_rate ? parseFloat(f.hourly_rate) : null, notes: f.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Shift posted"); onSaved();
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Post Open Shift</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div><Label>Client</Label>
          <Select value={f.client_id || ""} onValueChange={v => setF({ ...f, client_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Date</Label><Input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></div>
          <div><Label>Start</Label><Input type="time" value={f.start_time} onChange={e => setF({ ...f, start_time: e.target.value })} /></div>
          <div><Label>End</Label><Input type="time" value={f.end_time} onChange={e => setF({ ...f, end_time: e.target.value })} /></div>
        </div>
        <div><Label>Skills required (comma)</Label><Input value={f.skills_required} onChange={e => setF({ ...f, skills_required: e.target.value })} /></div>
        <div><Label>Certifications required (comma)</Label><Input value={f.certifications_required} onChange={e => setF({ ...f, certifications_required: e.target.value })} /></div>
        <div><Label>Hourly rate (optional)</Label><Input value={f.hourly_rate} onChange={e => setF({ ...f, hourly_rate: e.target.value })} /></div>
        <div><Label>Notes</Label><Textarea rows={2} value={f.notes || ""} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
      </div>
      <DialogFooter><Button onClick={save}>Post</Button></DialogFooter>
    </DialogContent>
  );
}

/* ============== AVAILABILITY ============== */
function AvailabilityTab() {
  const { user, hasAnyRole } = useAuth();
  const isManager = hasAnyRole(["admin","scheduler","manager","operations_manager","supervisor"]);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [cgId, setCgId] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState<any>({ day_of_week: 1, start_time: "09:00", end_time: "17:00" });

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("caregivers").select("id,name,user_id").order("name");
      setCaregivers(data ?? []);
      if (!isManager && user) {
        const mine = (data ?? []).find((c: any) => c.user_id === user.id);
        if (mine) setCgId(mine.id);
      }
    })();
  }, [user, isManager]);

  const refresh = async () => {
    if (!cgId) return;
    const { data } = await (supabase as any).from("caregiver_availability").select("*").eq("caregiver_id", cgId).order("day_of_week").order("start_time");
    setRows(data ?? []);
  };
  useEffect(() => { refresh(); }, [cgId]);

  const add = async () => {
    const { error } = await (supabase as any).from("caregiver_availability").insert({
      caregiver_id: cgId, day_of_week: parseInt(String(f.day_of_week)),
      start_time: f.start_time, end_time: f.end_time,
      max_hours_per_week: f.max_hours_per_week ? parseFloat(f.max_hours_per_week) : null,
      notes: f.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    refresh();
  };
  const del = async (id: string) => {
    await (supabase as any).from("caregiver_availability").delete().eq("id", id);
    refresh();
  };

  return (
    <div className="space-y-4 mt-4">
      {isManager && (
        <div className="max-w-xs">
          <Label>Caregiver</Label>
          <Select value={cgId} onValueChange={setCgId}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{caregivers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      {cgId && <>
        <Card>
          <CardHeader><CardTitle>Add Availability Window</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
              <div><Label>Day</Label>
                <Select value={String(f.day_of_week)} onValueChange={v => setF({ ...f, day_of_week: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Start</Label><Input type="time" value={f.start_time} onChange={e => setF({ ...f, start_time: e.target.value })} /></div>
              <div><Label>End</Label><Input type="time" value={f.end_time} onChange={e => setF({ ...f, end_time: e.target.value })} /></div>
              <div><Label>Max hrs/wk</Label><Input value={f.max_hours_per_week || ""} onChange={e => setF({ ...f, max_hours_per_week: e.target.value })} /></div>
              <Button onClick={add}>Add</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Current Availability</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No windows defined.</p>}
            {rows.map(r => (
              <div key={r.id} className="border rounded p-2 text-sm flex justify-between items-center">
                <span>{DAYS[r.day_of_week]} · {r.start_time}–{r.end_time}{r.max_hours_per_week ? ` · max ${r.max_hours_per_week}h/wk` : ""}</span>
                <Button size="sm" variant="ghost" onClick={() => del(r.id)}>Remove</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </>}
    </div>
  );
}

/* ============== OVERTIME FORECAST ============== */
function OvertimeTab() {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday
    return new Date(d.setDate(diff)).toISOString().slice(0, 10);
  });
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    const { data: cgs } = await (supabase as any).from("caregivers").select("id,name");
    if (!cgs) return;
    const out: any[] = [];
    for (const c of cgs) {
      const { data: hrs } = await (supabase as any).rpc("caregiver_week_hours", { _caregiver: c.id, _week_start: weekStart });
      out.push({ ...c, hours: Number(hrs ?? 0) });
    }
    out.sort((a, b) => b.hours - a.hours);
    setRows(out);
  };
  useEffect(() => { load(); }, [weekStart]);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-end gap-3">
        <div><Label>Week starting (Sun)</Label><Input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} /></div>
        <Button variant="outline" onClick={load}>Refresh</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Forecast vs 40-hour OT line</CardTitle><CardDescription>Based on EVV-verified hours when available</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {rows.map(r => {
            const pct = Math.min(100, (r.hours / 40) * 100);
            const ot = r.hours > 40;
            return (
              <div key={r.id} className="text-sm">
                <div className="flex justify-between"><span>{r.name}</span><span className={ot ? "text-destructive font-semibold" : ""}>{r.hours.toFixed(1)} h{ot ? ` (+${(r.hours - 40).toFixed(1)} OT)` : ""}</span></div>
                <div className="h-2 bg-muted rounded mt-1 overflow-hidden">
                  <div className={`h-full ${ot ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">No data.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

/* ============== GEOFENCE ============== */
function GeofenceTab() {
  const [clients, setClients] = useState<any[]>([]);
  const refresh = async () => {
    const { data } = await (supabase as any).from("clients").select("id,name,address,lat,lng,geofence_meters").order("name");
    setClients(data ?? []);
  };
  useEffect(() => { refresh(); }, []);
  const update = async (id: string, patch: any) => {
    const { error } = await (supabase as any).from("clients").update(patch).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };
  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader><CardTitle>Client Geofence</CardTitle><CardDescription>Sets clock-in tolerance radius (meters) at each client's address</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {clients.map(c => (
            <div key={c.id} className="border rounded p-3">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.address || "no address"}</div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Input placeholder="Latitude" defaultValue={c.lat || ""} onBlur={e => e.target.value !== String(c.lat || "") && update(c.id, { lat: e.target.value ? parseFloat(e.target.value) : null })} />
                <Input placeholder="Longitude" defaultValue={c.lng || ""} onBlur={e => e.target.value !== String(c.lng || "") && update(c.id, { lng: e.target.value ? parseFloat(e.target.value) : null })} />
                <Input placeholder="Radius (m)" defaultValue={c.geofence_meters} onBlur={e => parseInt(e.target.value) !== c.geofence_meters && update(c.id, { geofence_meters: parseInt(e.target.value) || 150 })} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}