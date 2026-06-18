import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, MapPin, Clock, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function CaregiverPortal() {
  const { user } = useAuth();
  const { visits, clients, caregivers, clockIn, clockOut, updateVisit } = useHomeCareContext();
  const [noteDrafts, setNoteDrafts] = useState<Record<string, { s: string; o: string; a: string; p: string }>>({});

  const me = caregivers.find((c) => c.user_id === user?.id);

  const today = new Date().toISOString().split("T")[0];
  const myVisits = useMemo(
    () => visits.filter((v) => me && v.caregiverId === me.id).sort((a, b) => a.date.localeCompare(b.date)),
    [visits, me]
  );
  const todays = myVisits.filter((v) => v.date === today);
  const upcoming = myVisits.filter((v) => v.date > today).slice(0, 5);

  const getLocation = () =>
    new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 5000 }
      );
    });

  const handleClockIn = async (visitId: string) => clockIn(visitId, await getLocation());
  const handleClockOut = async (visitId: string) => clockOut(visitId, await getLocation());

  const saveNote = async (visitId: string) => {
    const d = noteDrafts[visitId];
    if (!d) return;
    const { error } = await supabase.from("visit_notes").insert({
      visit_id: visitId,
      author_id: user?.id,
      subjective: d.s, objective: d.o, assessment: d.a, plan: d.p,
    });
    if (error) return toast.error(error.message);
    toast.success("SOAP note saved");
    setNoteDrafts((prev) => ({ ...prev, [visitId]: { s: "", o: "", a: "", p: "" } }));
  };

  if (!me) {
    return (
      <Card>
        <CardHeader><CardTitle>Caregiver Portal</CardTitle></CardHeader>
        <CardContent>Your account is not linked to a caregiver profile yet. Please ask an admin to link it.</CardContent>
      </Card>
    );
  }

  const renderVisit = (v: typeof visits[0]) => {
    const client = clients.find((c) => c.id === v.clientId);
    const draft = noteDrafts[v.id] ?? { s: "", o: "", a: "", p: "" };
    return (
      <Card key={v.id} className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base">{client?.name ?? "Client"}</CardTitle>
              <CardDescription>{client?.address}</CardDescription>
            </div>
            <Badge variant="outline">{v.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />{v.date} • {v.startTime} – {v.endTime}</div>
          {v.verificationStatus && (
            <div className="text-xs flex items-center gap-2 text-muted-foreground"><MapPin className="h-3 w-3" />{v.verificationStatus} {v.verificationIssues?.length ? `· ${v.verificationIssues.join("; ")}` : ""}</div>
          )}
          <div className="flex gap-2">
            {v.status === "Scheduled" && <Button size="sm" onClick={() => handleClockIn(v.id)}>Clock In</Button>}
            {v.status === "In-Progress" && <Button size="sm" variant="default" onClick={() => handleClockOut(v.id)}>Clock Out</Button>}
            {v.status === "Completed" && <Badge className="bg-success/10 text-success"><CheckCircle2 className="h-3 w-3 mr-1" />Done</Badge>}
          </div>
          {v.status !== "Scheduled" && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-xs font-semibold flex items-center gap-1"><FileText className="h-3 w-3" />SOAP note</div>
              <Input placeholder="Subjective" value={draft.s} onChange={(e) => setNoteDrafts((p) => ({ ...p, [v.id]: { ...draft, s: e.target.value } }))} />
              <Input placeholder="Objective" value={draft.o} onChange={(e) => setNoteDrafts((p) => ({ ...p, [v.id]: { ...draft, o: e.target.value } }))} />
              <Input placeholder="Assessment" value={draft.a} onChange={(e) => setNoteDrafts((p) => ({ ...p, [v.id]: { ...draft, a: e.target.value } }))} />
              <Textarea placeholder="Plan" value={draft.p} onChange={(e) => setNoteDrafts((p) => ({ ...p, [v.id]: { ...draft, p: e.target.value } }))} />
              <Button size="sm" variant="outline" onClick={() => saveNote(v.id)}>Save Note</Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg"><Smartphone className="h-6 w-6 text-primary-foreground" /></div>
        <div><h1 className="text-2xl font-bold">My Visits</h1><p className="text-muted-foreground">Welcome, {me.name}</p></div>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">Today ({todays.length})</h2>
        <div className="space-y-3">{todays.length ? todays.map(renderVisit) : <p className="text-muted-foreground text-sm">No visits today.</p>}</div>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3">Upcoming</h2>
        <div className="space-y-3">{upcoming.length ? upcoming.map(renderVisit) : <p className="text-muted-foreground text-sm">No upcoming visits.</p>}</div>
      </div>
    </div>
  );
}