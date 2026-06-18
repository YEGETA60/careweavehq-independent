import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getGps } from "../lib/geolocation";

export function VisitDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [tasks, setTasks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");

  const load = async () => {
    const { data } = await (supabase as any).rpc("caregiver_today_visits");
    const v = (data ?? []).find((x: any) => x.id === id);
    setVisit(v);
    if (v) {
      const initial: Record<string, boolean> = {};
      (v.care_plan ?? []).forEach((t: string) => {
        initial[t] = (v.tasks_completed ?? []).includes(t);
      });
      setTasks(initial);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const callClockEvent = async (event_type: "clock_in" | "clock_out", manual_reason?: string) => {
    if (event_type === "clock_out") {
      const plan: string[] = visit?.care_plan ?? [];
      const incomplete = plan.filter((t) => !tasks[t]);
      if (incomplete.length > 0) {
        toast.error(
          `Complete all care plan tasks before clocking out (${incomplete.length} remaining)`
        );
        return;
      }
    }
    setBusy(true);
    let lat: number | undefined, lng: number | undefined, accuracy: number | undefined;
    try {
      const fix = await getGps();
      lat = fix.lat; lng = fix.lng; accuracy = fix.accuracy;
    } catch (e: any) {
      if (!manual_reason) {
        const reason = prompt(`GPS unavailable (${e.message}). Type a reason to clock ${event_type === "clock_in" ? "in" : "out"} manually:`);
        if (!reason) { setBusy(false); return; }
        manual_reason = reason;
      }
    }

    const completed = Object.entries(tasks).filter(([_, v]) => v).map(([k]) => k);

    const { data, error } = await supabase.functions.invoke("mobile-clock-event", {
      body: {
        visit_id: id,
        event_type,
        lat, lng, accuracy,
        manual_reason,
        notes: event_type === "clock_out" ? notes : undefined,
        tasks_completed: event_type === "clock_out" ? completed : undefined,
      },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Clock event failed");
      return;
    }
    const status = (data as any).verification_status;
    toast.success(`${event_type === "clock_in" ? "Clocked in" : "Clocked out"} • ${status}`);
    if (event_type === "clock_out") nav("/m/today");
    else load();
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!visit) return (
    <div className="p-6">
      <Button variant="ghost" onClick={() => nav("/m/today")}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
      <p className="mt-4 text-sm text-muted-foreground">Visit not found.</p>
    </div>
  );

  const isInProgress = visit.status === "In Progress";
  const isDone = visit.status === "Completed";
  const planTasks: string[] = visit.care_plan ?? [];
  const completedCount = planTasks.filter((t) => tasks[t]).length;
  const allTasksDone = planTasks.length === 0 || completedCount === planTasks.length;

  return (
    <div className="px-4 pt-4 space-y-4">
      <button onClick={() => nav("/m/today")} className="flex items-center text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </button>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">{visit.client_name}</h1>
          {isInProgress && <Badge className="bg-success/15 text-success border-success/30">Live</Badge>}
          {isDone && <Badge variant="outline">Completed</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{visit.start_time}–{visit.end_time}</p>
        {visit.client_address && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(visit.client_address)}`}
            target="_blank" rel="noreferrer"
            className="mt-3 flex items-start gap-2 text-sm text-primary"
          >
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{visit.client_address}</span>
          </a>
        )}
        {visit.client_phone && (
          <a href={`tel:${visit.client_phone}`} className="mt-2 flex items-center gap-2 text-sm text-primary">
            <Phone className="h-4 w-4" /> {visit.client_phone}
          </a>
        )}
        {visit.verification_status && visit.verification_status !== "Unverified" && (
          <div className="mt-3 text-xs flex items-center gap-1 text-muted-foreground">
            {visit.verification_status === "Verified"
              ? <CheckCircle2 className="h-3 w-3 text-success" />
              : <AlertCircle className="h-3 w-3 text-warning" />}
            EVV status: {visit.verification_status}
          </div>
        )}
      </Card>

      {(visit.care_plan ?? []).length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Care plan tasks</h2>
            <Badge variant={allTasksDone ? "outline" : "secondary"} className={allTasksDone ? "border-success/30 text-success" : ""}>
              {completedCount}/{planTasks.length} done
            </Badge>
          </div>
          {!allTasksDone && isInProgress && (
            <p className="text-xs text-muted-foreground mb-3">
              All tasks must be checked off before you can clock out.
            </p>
          )}
          <div className="space-y-3">
            {visit.care_plan.map((t: string) => (
              <label key={t} className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={!!tasks[t]}
                  onCheckedChange={(c) => setTasks((prev) => ({ ...prev, [t]: !!c }))}
                  disabled={isDone}
                />
                <span className={tasks[t] ? "line-through text-muted-foreground" : ""}>{t}</span>
              </label>
            ))}
          </div>
        </Card>
      )}

      {isInProgress && (
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Visit notes</h2>
          <Textarea
            placeholder="What happened during the visit? Any concerns?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
          />
        </Card>
      )}

      {!isDone && (
        <div className="sticky bottom-20 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-border">
          {isInProgress ? (
            <Button
              size="lg"
              className="w-full h-14 text-base"
              onClick={() => callClockEvent("clock_out")}
              disabled={busy || !allTasksDone}
            >
              {busy
                ? "Clocking out…"
                : !allTasksDone
                  ? `Complete tasks (${planTasks.length - completedCount} left)`
                  : "Clock Out"}
            </Button>
          ) : (
            <Button size="lg" className="w-full h-14 text-base" onClick={() => callClockEvent("clock_in")} disabled={busy}>
              {busy ? "Clocking in…" : "Clock In"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}