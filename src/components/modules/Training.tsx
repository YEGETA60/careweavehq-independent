import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GraduationCap, ExternalLink, CheckCircle2, AlertTriangle, Clock, Plus, Flame, UserPlus, Trash2 } from "lucide-react";
import { LearningLibrary } from "./training/LearningLibrary";

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  provider: string | null;
  external_url: string | null;
  duration_minutes: number | null;
  required_for_roles: AppRole[];
  renewal_months: number | null;
  active: boolean;
}
interface Completion {
  id: string;
  user_id: string;
  course_id: string;
  completed_at: string;
  expires_at: string | null;
  certificate_url: string | null;
  notes: string | null;
}
interface Assignment {
  id: string;
  course_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
  notes: string | null;
}
interface Learner { user_id: string; name: string }

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const days = Array.from(new Set(dates.map((d) => new Date(d).toISOString().slice(0, 10)))).sort().reverse();
  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // Allow streak to start today or yesterday
  const today = cursor.toISOString().slice(0, 10);
  const yest = new Date(cursor.getTime() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yest) return 0;
  let expected = new Date(days[0]);
  for (const d of days) {
    if (d === expected.toISOString().slice(0, 10)) {
      streak++;
      expected = new Date(expected.getTime() - 86400000);
    } else break;
  }
  return streak;
}

function statusOf(c: Course, mine: Completion[]): { label: string; tone: "ok" | "warn" | "danger" | "todo"; latest?: Completion } {
  const latest = [...mine].sort((a, b) => +new Date(b.completed_at) - +new Date(a.completed_at))[0];
  if (!latest) return { label: "Not started", tone: "todo" };
  if (!latest.expires_at) return { label: "Completed", tone: "ok", latest };
  const exp = new Date(latest.expires_at).getTime();
  const now = Date.now();
  const days = Math.round((exp - now) / 86400000);
  if (days < 0) return { label: `Expired ${-days}d ago`, tone: "danger", latest };
  if (days < 30) return { label: `Renew in ${days}d`, tone: "warn", latest };
  return { label: `Valid ${days}d`, tone: "ok", latest };
}

const toneClass: Record<string, string> = {
  ok: "bg-success text-success-foreground",
  warn: "bg-warning text-warning-foreground",
  danger: "bg-destructive text-destructive-foreground",
  todo: "bg-muted text-muted-foreground",
};

export function Training() {
  const { user, roles, hasAnyRole } = useAuth();
  const isManager = hasAnyRole(["admin", "manager", "operations_manager", "supervisor", "scheduler"]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState<Course | null>(null);
  const [completedAt, setCompletedAt] = useState(new Date().toISOString().slice(0, 10));
  const [certUrl, setCertUrl] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [c, cm, asg, cg] = await Promise.all([
      (supabase as any).from("training_courses").select("*").order("category"),
      (supabase as any).from("training_completions").select("*"),
      (supabase as any).from("training_assignments").select("*"),
      (supabase as any).from("caregivers").select("user_id, name"),
    ]);
    if (c.data) setCourses(c.data as Course[]);
    if (cm.data) setCompletions(cm.data as Completion[]);
    if (asg.data) setAssignments(asg.data as Assignment[]);
    if (cg.data) {
      setLearners(
        (cg.data as { user_id: string | null; name: string }[])
          .filter((x) => !!x.user_id)
          .map((x) => ({ user_id: x.user_id as string, name: x.name }))
      );
    }
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: recompute streak / progress whenever completions or assignments change anywhere.
  useEffect(() => {
    const ch = supabase
      .channel("training-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "training_completions" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "training_assignments" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  const myCompletionsByCourse = useMemo(() => {
    const map: Record<string, Completion[]> = {};
    completions.filter(c => c.user_id === user?.id).forEach(c => {
      (map[c.course_id] = map[c.course_id] || []).push(c);
    });
    return map;
  }, [completions, user?.id]);

  const myAssignedIds = useMemo(
    () => new Set(assignments.filter((a) => a.user_id === user?.id).map((a) => a.course_id)),
    [assignments, user?.id]
  );

  const required = courses.filter(
    (c) => c.required_for_roles.some((r) => roles.includes(r)) || myAssignedIds.has(c.id)
  );
  const optional = courses.filter(
    (c) => !c.required_for_roles.some((r) => roles.includes(r)) && !myAssignedIds.has(c.id)
  );

  // ---------- Personal progress metrics ----------
  const myCompletions = completions.filter((c) => c.user_id === user?.id);
  const requiredCount = required.length;
  const requiredCompleted = required.filter((c) => {
    const s = statusOf(c, myCompletionsByCourse[c.id] ?? []);
    return s.tone === "ok" || s.tone === "warn";
  }).length;
  const percent = requiredCount ? Math.round((requiredCompleted / requiredCount) * 100) : 0;
  const streak = computeStreak(myCompletions.map((c) => c.completed_at));
  const sortedDates = myCompletions.map((c) => c.completed_at).sort();
  const lastCompletion = sortedDates.length ? sortedDates[sortedDates.length - 1] : undefined;

  const submitCompletion = async () => {
    if (!logOpen || !user) return;
    const expires = logOpen.renewal_months
      ? new Date(new Date(completedAt).getTime() + logOpen.renewal_months * 30 * 86400000).toISOString()
      : null;
    const { data, error } = await (supabase as any)
      .from("training_completions")
      .insert({
        user_id: user.id,
        course_id: logOpen.id,
        completed_at: new Date(completedAt).toISOString(),
        expires_at: expires,
        certificate_url: certUrl || null,
        notes: logNotes || null,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);

    // Optimistically merge the new row so streak/percent reflect the change immediately,
    // then refresh from the server to confirm.
    const newRow = data as Completion;
    const nextCompletions = [...completions.filter((c) => c.id !== newRow.id), newRow];
    setCompletions(nextCompletions);

    const myNext = nextCompletions.filter((c) => c.user_id === user.id);
    const newStreak = computeStreak(myNext.map((c) => c.completed_at));
    const newPercent = (() => {
      const reqIds = required.map((r) => r.id).concat(logOpen.id);
      const uniq = Array.from(new Set(reqIds));
      const map: Record<string, Completion[]> = {};
      myNext.forEach((c) => { (map[c.course_id] = map[c.course_id] || []).push(c); });
      const done = uniq.filter((id) => {
        const course = courses.find((c) => c.id === id) ?? logOpen;
        const st = statusOf(course, map[id] ?? []);
        return st.tone === "ok" || st.tone === "warn";
      }).length;
      return uniq.length ? Math.round((done / uniq.length) * 100) : 0;
    })();

    toast.success(`Completion saved · streak ${newStreak}d · progress ${newPercent}%`);
    setLogOpen(null); setCertUrl(""); setLogNotes("");
    refresh();
  };

  const renderCourseCard = (c: Course) => {
    const mine = myCompletionsByCourse[c.id] ?? [];
    const s = statusOf(c, mine);
    return (
      <Card key={c.id} className="flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base leading-snug">{c.title}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {c.provider ?? "—"} · {c.category}
                {c.duration_minutes ? ` · ${c.duration_minutes} min` : ""}
              </CardDescription>
            </div>
            <Badge className={toneClass[s.tone]}>
              {s.tone === "ok" && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {s.tone === "warn" && <Clock className="h-3 w-3 mr-1" />}
              {s.tone === "danger" && <AlertTriangle className="h-3 w-3 mr-1" />}
              {s.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3">
          {c.description && <p className="text-sm text-muted-foreground">{c.description}</p>}
          {c.renewal_months && <p className="text-xs text-muted-foreground">Renews every {c.renewal_months} months</p>}
          <div className="action-bar mt-auto">
            {c.external_url && (
              <Button variant="outline" asChild>
                <a href={c.external_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Open training
                </a>
              </Button>
            )}
            <Button onClick={() => { setLogOpen(c); setCompletedAt(new Date().toISOString().slice(0,10)); }}>
              Log completion
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Learning Home</CardTitle>
                <CardDescription>HIPAA & home care compliance training for caregivers and staff.</CardDescription>
              </div>
            </div>
            {isManager && (
              <div className="flex gap-2 flex-wrap">
                <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><UserPlus className="h-4 w-4" />Assign course</Button>
                  </DialogTrigger>
                  <AssignCourseDialog
                    courses={courses}
                    learners={learners}
                    assignedBy={user?.id ?? null}
                    onClose={(saved) => { setAssignOpen(false); if (saved) refresh(); }}
                  />
                </Dialog>
                <Dialog open={newOpen} onOpenChange={setNewOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4" />Add course</Button>
                  </DialogTrigger>
                  <NewCourseDialog onClose={(saved) => { setNewOpen(false); if (saved) refresh(); }} />
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Required progress</p>
              <div className="flex items-baseline gap-2">
                <span className="stat-value">{percent}%</span>
                <span className="text-xs text-muted-foreground">{requiredCompleted}/{requiredCount} current</span>
              </div>
              <Progress value={percent} />
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Learning streak</p>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="stat-value">{streak}</span>
                <span className="text-xs text-muted-foreground">day{streak === 1 ? "" : "s"}</span>
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Last completion</p>
              <p className="text-base font-medium">
                {lastCompletion ? new Date(lastCompletion).toLocaleDateString() : "—"}
              </p>
              <p className="text-xs text-muted-foreground">{myCompletions.length} total logged</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="required">
        <TabsList>
          <TabsTrigger value="required">Required for me ({required.length})</TabsTrigger>
          <TabsTrigger value="optional">Other courses ({optional.length})</TabsTrigger>
          <TabsTrigger value="library">Learning Library</TabsTrigger>
          {isManager && <TabsTrigger value="team">Team progress</TabsTrigger>}
        </TabsList>
        <TabsContent value="required" className="mt-4">
          {loading ? <p className="text-muted-foreground">Loading…</p> :
            required.length === 0 ? <p className="text-muted-foreground text-sm">No required courses for your role.</p> :
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{required.map(renderCourseCard)}</div>}
        </TabsContent>
        <TabsContent value="optional" className="mt-4">
          {optional.length === 0 ? <p className="text-muted-foreground text-sm">No additional courses.</p> :
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{optional.map(renderCourseCard)}</div>}
        </TabsContent>
        <TabsContent value="library" className="mt-4">
          <LearningLibrary />
        </TabsContent>
        {isManager && (
          <TabsContent value="team" className="mt-4">
            <TeamProgress
              courses={courses}
              completions={completions}
              assignments={assignments}
              learners={learners}
              onUnassign={async (id) => {
                const { error } = await (supabase as any).from("training_assignments").delete().eq("id", id);
                if (error) return toast.error(error.message);
                toast.success("Assignment removed");
                refresh();
              }}
            />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!logOpen} onOpenChange={(o) => !o && setLogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log completion · {logOpen?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="cdate">Completed on</Label>
              <Input id="cdate" type="date" value={completedAt} onChange={(e) => setCompletedAt(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="curl">Certificate URL (optional)</Label>
              <Input id="curl" value={certUrl} onChange={(e) => setCertUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cnotes">Notes</Label>
              <Textarea id="cnotes" value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter className="action-bar">
            <Button variant="outline" onClick={() => setLogOpen(null)}>Cancel</Button>
            <Button onClick={submitCompletion}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewCourseDialog({ onClose }: { onClose: (saved: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [category, setCategory] = useState("compliance");
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [renewal, setRenewal] = useState("12");
  const [desc, setDesc] = useState("");
  const save = async () => {
    if (!title) return toast.error("Title required");
    const { error } = await (supabase as any).from("training_courses").insert({
      title, provider: provider || null, category, external_url: url || null,
      duration_minutes: duration ? Number(duration) : null,
      renewal_months: renewal ? Number(renewal) : null,
      description: desc || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Course added");
    onClose(true);
  };
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add training course</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="form-row">
          <div className="space-y-1"><Label>Provider</Label><Input value={provider} onChange={(e) => setProvider(e.target.value)} /></div>
          <div className="space-y-1"><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
        </div>
        <div className="space-y-1"><Label>External URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
        <div className="form-row">
          <div className="space-y-1"><Label>Duration (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          <div className="space-y-1"><Label>Renews every (months)</Label><Input type="number" value={renewal} onChange={(e) => setRenewal(e.target.value)} /></div>
        </div>
        <div className="space-y-1"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
      </div>
      <DialogFooter className="action-bar">
        <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
        <Button onClick={save}>Save course</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TeamProgress({
  courses,
  completions,
  assignments,
  learners,
  onUnassign,
}: {
  courses: Course[];
  completions: Completion[];
  assignments: Assignment[];
  learners: Learner[];
  onUnassign: (id: string) => void;
}) {
  const nameOf = (uid: string) => learners.find((l) => l.user_id === uid)?.name ?? uid.slice(0, 8);
  const courseOf = (cid: string) => courses.find((c) => c.id === cid)?.title ?? "Course";

  const learnerIds = useMemo(() => {
    const ids = new Set<string>();
    learners.forEach((l) => ids.add(l.user_id));
    completions.forEach((c) => ids.add(c.user_id));
    assignments.forEach((a) => ids.add(a.user_id));
    return Array.from(ids);
  }, [learners, completions, assignments]);

  const summary = (uid: string) => {
    const userAssigned = assignments.filter((a) => a.user_id === uid);
    const userCompletions = completions.filter((c) => c.user_id === uid);
    const completedSet = new Set(
      userCompletions
        .filter((c) => !c.expires_at || new Date(c.expires_at) > new Date())
        .map((c) => c.course_id)
    );
    const total = userAssigned.length;
    const done = userAssigned.filter((a) => completedSet.has(a.course_id)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const streak = computeStreak(userCompletions.map((c) => c.completed_at));
    return { total, done, pct, streak, userAssigned, userCompletions };
  };

  if (learnerIds.length === 0)
    return <p className="text-muted-foreground text-sm">No learners or completions yet.</p>;

  return (
    <div className="space-y-3">
      {learnerIds.map((uid) => {
        const s = summary(uid);
        return (
          <Card key={uid}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium">{nameOf(uid)}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.done}/{s.total} assigned current · {s.userCompletions.length} total completions
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="gap-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {s.streak}d streak
                  </Badge>
                  <Badge variant="outline">{s.pct}%</Badge>
                </div>
              </div>
              <Progress value={s.pct} />
              {s.userAssigned.length > 0 && (
                <div className="space-y-1 pt-1">
                  {s.userAssigned.map((a) => {
                    const done = s.userCompletions.find((c) => c.course_id === a.course_id);
                    return (
                      <div key={a.id} className="flex items-center justify-between text-xs gap-2">
                        <span className="truncate">
                          {courseOf(a.course_id)}
                          {a.due_date && <span className="text-muted-foreground"> · due {a.due_date}</span>}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {done ? (
                            <Badge className="bg-success text-success-foreground">
                              {new Date(done.completed_at).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => onUnassign(a.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AssignCourseDialog({
  courses,
  learners,
  assignedBy,
  onClose,
}: {
  courses: Course[];
  learners: Learner[];
  assignedBy: string | null;
  onClose: (saved: boolean) => void;
}) {
  const [courseId, setCourseId] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const toggle = (uid: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(uid) ? n.delete(uid) : n.add(uid);
      return n;
    });

  const save = async () => {
    if (!courseId) return toast.error("Pick a course");
    if (selected.size === 0) return toast.error("Pick at least one user");
    const rows = Array.from(selected).map((uid) => ({
      course_id: courseId,
      user_id: uid,
      assigned_by: assignedBy,
      due_date: dueDate || null,
      notes: notes || null,
    }));
    const { error } = await (supabase as any)
      .from("training_assignments")
      .upsert(rows, { onConflict: "course_id,user_id" });
    if (error) return toast.error(error.message);
    toast.success(`Assigned to ${selected.size} ${selected.size === 1 ? "person" : "people"}`);
    onClose(true);
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Assign course</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Course</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger><SelectValue placeholder="Pick a course" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Assign to</Label>
          <div className="border rounded max-h-56 overflow-y-auto p-2 space-y-1">
            {learners.length === 0 && (
              <p className="text-xs text-muted-foreground">No caregivers linked to user accounts yet.</p>
            )}
            {learners.map((l) => (
              <label key={l.user_id} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-muted rounded">
                <Checkbox checked={selected.has(l.user_id)} onCheckedChange={() => toggle(l.user_id)} />
                <span>{l.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="form-row">
          <div className="space-y-1"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          <div className="space-y-1"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
      </div>
      <DialogFooter className="action-bar">
        <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
        <Button onClick={save}>Assign</Button>
      </DialogFooter>
    </DialogContent>
  );
}