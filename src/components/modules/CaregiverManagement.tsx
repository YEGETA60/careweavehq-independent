import { useEffect, useMemo, useState } from "react";
import { CompanyBrandingHeader } from "@/components/CompanyBrandingHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserCheck, Plus, Award, CheckCircle, Printer, Users, Clock, ShieldAlert, GraduationCap, AlertTriangle } from "lucide-react";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { printPage } from "@/lib/print-utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CredRow { id: string; caregiver_id: string; type: string; number: string | null; expiry_date: string | null; }
interface CompletionRow { user_id: string; course_id: string; expires_at: string | null; }
interface CourseRow { id: string; title: string; required_for_roles: string[]; renewal_months: number | null; }

export function CaregiverManagement() {
  const { caregivers, clients, visits, addCaregiver } = useHomeCareContext();
  const [isAddingCaregiver, setIsAddingCaregiver] = useState(false);
  const [openCgId, setOpenCgId] = useState<string | null>(null);
  const [creds, setCreds] = useState<CredRow[]>([]);
  const [completions, setCompletions] = useState<CompletionRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);

  useEffect(() => {
    (async () => {
      const [c, t, co] = await Promise.all([
        supabase.from("credentials").select("id,caregiver_id,type,number,expiry_date"),
        supabase.from("training_completions").select("user_id,course_id,expires_at"),
        supabase.from("training_courses").select("id,title,required_for_roles,renewal_months").eq("active", true),
      ]);
      setCreds((c.data ?? []) as CredRow[]);
      setCompletions((t.data ?? []) as CompletionRow[]);
      setCourses((co.data ?? []) as CourseRow[]);
    })();
  }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);

  const linksByCaregiver = useMemo(() => {
    const map: Record<string, {
      clientIds: Set<string>;
      weekHours: number;
      upcoming: typeof visits;
      todayCount: number;
    }> = {};
    for (const cg of caregivers) {
      map[cg.id] = { clientIds: new Set(), weekHours: 0, upcoming: [], todayCount: 0 };
    }
    for (const v of visits) {
      const m = map[v.caregiverId];
      if (!m) continue;
      m.clientIds.add(v.clientId);
      const d = new Date(v.date + "T00:00:00");
      if (d >= weekStart && d < weekEnd && v.status === "Completed") {
        const start = new Date(`1970-01-01T${v.verifiedStartTime ?? v.startTime}`);
        const end = new Date(`1970-01-01T${v.verifiedEndTime ?? v.endTime}`);
        m.weekHours += Math.max(0, (end.getTime() - start.getTime()) / 3600000);
      }
      if (d >= today && v.status === "Scheduled") m.upcoming.push(v);
      if (v.date === today.toISOString().slice(0, 10)) m.todayCount += 1;
    }
    for (const cg of caregivers) {
      map[cg.id].upcoming.sort((a, b) =>
        (a.date + a.startTime).localeCompare(b.date + b.startTime),
      );
    }
    return map;
  }, [caregivers, visits, weekStart, weekEnd, today]);

  const credSummary = (cgId: string) => {
    const list = creds.filter(c => c.caregiver_id === cgId);
    let expired = 0, expiring = 0;
    for (const c of list) {
      if (!c.expiry_date) continue;
      const days = (new Date(c.expiry_date).getTime() - Date.now()) / 86400000;
      if (days < 0) expired++;
      else if (days < 30) expiring++;
    }
    return { total: list.length, expired, expiring, items: list };
  };

  const trainingSummary = (cg: { user_id?: string | null }) => {
    if (!cg.user_id) return { required: courses.length, completed: 0, expired: 0, missing: courses.length };
    const required = courses.filter(c => (c.required_for_roles ?? []).includes("caregiver"));
    let completed = 0, expired = 0;
    for (const c of required) {
      const comp = completions.find(x => x.user_id === cg.user_id && x.course_id === c.id);
      if (!comp) continue;
      if (comp.expires_at && new Date(comp.expires_at) < new Date()) expired++;
      else completed++;
    }
    const missing = required.length - completed - expired;
    return { required: required.length, completed, expired, missing };
  };

  const openCg = caregivers.find(c => c.id === openCgId) ?? null;

  const [newCaregiver, setNewCaregiver] = useState({
    name: "",
    phone: "",
    skills: "",
    hourlyWage: 16,
    status: "Available" as const,
    certifications: ""
  });

  const handleAddCaregiver = () => {
    addCaregiver({
      ...newCaregiver,
      skills: newCaregiver.skills.split(',').map(s => s.trim()).filter(s => s),
      certifications: newCaregiver.certifications.split(',').map(s => s.trim()).filter(s => s)
    });
    setIsAddingCaregiver(false);
    setNewCaregiver({
      name: "",
      phone: "",
      skills: "",
      hourlyWage: 16,
      status: "Available",
      certifications: ""
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      Available: "bg-success/10 text-success border-success/20",
      Assigned: "bg-primary/10 text-primary border-primary/20",
      "Off-Duty": "bg-muted/10 text-muted-foreground border-muted/20"
    };
    return colors[status as keyof typeof colors] || colors.Available;
  };

  return (
    <div className="space-y-6">
      <CompanyBrandingHeader />
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
            <UserCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Caregiver Management</h1>
            <p className="text-muted-foreground">Staff profiles, credentials & performance tracking</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printPage} className="no-print">
            <Printer className="h-4 w-4 mr-2" />
            Print List
          </Button>
          <Dialog open={isAddingCaregiver} onOpenChange={setIsAddingCaregiver}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2" data-tour="caregivers-add-btn">
                <Plus className="h-4 w-4" />
                <span>Add Caregiver</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Caregiver</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  data-tour="caregivers-name-input"
                  value={newCaregiver.name}
                  onChange={(e) => setNewCaregiver(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter caregiver's full name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={newCaregiver.phone}
                  onChange={(e) => setNewCaregiver(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Textarea
                  id="skills"
                  data-tour="caregivers-skills-input"
                  value={newCaregiver.skills}
                  onChange={(e) => setNewCaregiver(prev => ({ ...prev, skills: e.target.value }))}
                  placeholder="Personal Care, Medication Management, Dementia Care"
                />
              </div>
              <div>
                <Label htmlFor="certifications">Certifications (comma-separated)</Label>
                <Textarea
                  id="certifications"
                  value={newCaregiver.certifications}
                  onChange={(e) => setNewCaregiver(prev => ({ ...prev, certifications: e.target.value }))}
                  placeholder="CNA, CPR, First Aid"
                />
              </div>
              <div>
                <Label htmlFor="wage">Hourly Wage ($)</Label>
                <Input
                  id="wage"
                  type="number"
                  value={newCaregiver.hourlyWage}
                  onChange={(e) => setNewCaregiver(prev => ({ ...prev, hourlyWage: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <Button onClick={handleAddCaregiver} className="w-full" data-tour="caregivers-save-btn">
                Add Caregiver
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {caregivers.map((caregiver) => (
          <Card key={caregiver.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setOpenCgId(caregiver.id)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-muted rounded-full">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{caregiver.name}</CardTitle>
                    <CardDescription className="text-xs">{caregiver.phone || "No phone"}</CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(caregiver.status)} variant="secondary">
                  {caregiver.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const links = linksByCaregiver[caregiver.id];
                const cs = credSummary(caregiver.id);
                const ts = trainingSummary(caregiver);
                const assignedNames = [...links.clientIds].map(cid => clients.find(c => c.id === cid)?.name).filter(Boolean) as string[];
                return (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-md bg-muted/50">
                        <div className="text-lg font-bold">{links.clientIds.size}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Clients</div>
                      </div>
                      <div className="p-2 rounded-md bg-muted/50">
                        <div className="text-lg font-bold">{links.weekHours.toFixed(1)}h</div>
                        <div className="text-[10px] text-muted-foreground uppercase">This week</div>
                      </div>
                      <div className="p-2 rounded-md bg-muted/50">
                        <div className="text-lg font-bold">{links.upcoming.length}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Upcoming</div>
                      </div>
                    </div>
                    {assignedNames.length > 0 && (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Assigned to: </span>
                        <span className="font-medium">{assignedNames.slice(0, 3).join(", ")}{assignedNames.length > 3 ? ` +${assignedNames.length - 3}` : ""}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {cs.expired > 0 && <Badge variant="destructive"><ShieldAlert className="h-3 w-3 mr-1" />{cs.expired} expired credential{cs.expired === 1 ? "" : "s"}</Badge>}
                      {cs.expiring > 0 && <Badge className="bg-warning text-warning-foreground"><AlertTriangle className="h-3 w-3 mr-1" />{cs.expiring} expiring soon</Badge>}
                      {cs.expired === 0 && cs.expiring === 0 && cs.total > 0 && <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />{cs.total} credentials current</Badge>}
                      {ts.required > 0 && (
                        <Badge variant={ts.missing + ts.expired > 0 ? "destructive" : "secondary"}>
                          <GraduationCap className="h-3 w-3 mr-1" />
                          Training {ts.completed}/{ts.required}
                        </Badge>
                      )}
                    </div>
                  </>
                );
              })()}

              <div className="flex justify-between items-center pt-2 border-t no-print">
                <span className="text-sm font-medium">${caregiver.hourlyWage}/hr</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setOpenCgId(caregiver.id); }}>
                    View Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!openCg} onOpenChange={(o) => !o && setOpenCgId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {openCg && (() => {
            const links = linksByCaregiver[openCg.id];
            const cs = credSummary(openCg.id);
            const ts = trainingSummary(openCg);
            const assigned = [...links.clientIds].map(cid => clients.find(c => c.id === cid)).filter(Boolean) as { id: string; name: string }[];
            const upcoming = links.upcoming.slice(0, 8);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />{openCg.name}</DialogTitle>
                  <DialogDescription>{openCg.phone || "No phone"} · ${openCg.hourlyWage}/hr · {openCg.status}</DialogDescription>
                </DialogHeader>
                <div className="space-y-5 mt-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-md border"><div className="text-xs text-muted-foreground">Assigned clients</div><div className="text-2xl font-bold">{assigned.length}</div></div>
                    <div className="p-3 rounded-md border"><div className="text-xs text-muted-foreground">Hours this week</div><div className="text-2xl font-bold">{links.weekHours.toFixed(1)}</div></div>
                    <div className="p-3 rounded-md border"><div className="text-xs text-muted-foreground">Upcoming visits</div><div className="text-2xl font-bold">{links.upcoming.length}</div></div>
                    <div className="p-3 rounded-md border"><div className="text-xs text-muted-foreground">Today's visits</div><div className="text-2xl font-bold">{links.todayCount}</div></div>
                  </div>

                  <section>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4" />Assigned clients</h3>
                    {assigned.length === 0 ? <p className="text-sm text-muted-foreground">No clients assigned yet.</p> : (
                      <div className="flex flex-wrap gap-2">
                        {assigned.map(c => <Badge key={c.id} variant="outline">{c.name}</Badge>)}
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4" />Upcoming schedule</h3>
                    {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">No upcoming scheduled visits.</p> : (
                      <ul className="text-sm divide-y">
                        {upcoming.map(v => {
                          const cl = clients.find(c => c.id === v.clientId);
                          return (
                            <li key={v.id} className="py-2 flex justify-between">
                              <span>{v.date} · {v.startTime}–{v.endTime}</span>
                              <span className="text-muted-foreground">{cl?.name ?? "—"}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Credentials & licenses</h3>
                    {cs.items.length === 0 ? <p className="text-sm text-muted-foreground">No credentials on file.</p> : (
                      <ul className="text-sm divide-y">
                        {cs.items.map(c => {
                          const days = c.expiry_date ? (new Date(c.expiry_date).getTime() - Date.now()) / 86400000 : Infinity;
                          const status = !c.expiry_date ? "no-expiry" : days < 0 ? "expired" : days < 30 ? "expiring" : "valid";
                          return (
                            <li key={c.id} className="py-2 flex justify-between items-center">
                              <span>{c.type} {c.number ? <span className="font-mono text-xs text-muted-foreground">({c.number})</span> : null}</span>
                              <span className="text-xs">
                                {c.expiry_date ?? "no expiry"}{" "}
                                {status === "expired" && <Badge variant="destructive" className="ml-2">expired</Badge>}
                                {status === "expiring" && <Badge className="ml-2 bg-warning text-warning-foreground">expiring</Badge>}
                                {status === "valid" && <Badge variant="secondary" className="ml-2">valid</Badge>}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><GraduationCap className="h-4 w-4" />Training compliance</h3>
                    {!openCg.user_id ? (
                      <p className="text-sm text-muted-foreground">No linked user account — training records require a user_id linked to auth. Link a user to track HR/training data here.</p>
                    ) : (
                      <div className="text-sm">
                        <div>Required courses: <strong>{ts.required}</strong></div>
                        <div>Completed & current: <strong className="text-success">{ts.completed}</strong></div>
                        <div>Expired: <strong className="text-destructive">{ts.expired}</strong></div>
                        <div>Missing: <strong className="text-warning">{ts.missing}</strong></div>
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="font-semibold mb-2 flex items-center gap-2"><Award className="h-4 w-4" />Skills & certifications</h3>
                    <div className="flex flex-wrap gap-1">
                      {openCg.skills.map((s, i) => <Badge key={`s${i}`} variant="outline" className="text-xs">{s}</Badge>)}
                      {openCg.certifications.map((c, i) => <Badge key={`c${i}`} className="bg-primary/10 text-primary text-xs">{c}</Badge>)}
                      {openCg.skills.length === 0 && openCg.certifications.length === 0 && <span className="text-xs text-muted-foreground">None on file</span>}
                    </div>
                  </section>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}