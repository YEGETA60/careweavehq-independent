import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, Calendar, FileText, Receipt, MapPin, Clock, CheckCircle2, AlertCircle, Radio, Phone } from "lucide-react";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { MapContainer, TileLayer, CircleMarker, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const today = () => new Date().toISOString().slice(0, 10);

function timeToMinutes(t?: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function nowMinutes() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }

function VisitStatusPill({ v }: { v: any }) {
  if (v.status === "In Progress" || v.status === "In-Progress") return <Badge className="bg-success/15 text-success border-success/30 gap-1"><Radio className="h-3 w-3 animate-pulse" />Live</Badge>;
  if (v.status === "Completed") return <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3 text-success" />Completed</Badge>;
  if (v.status === "Missed") return <Badge variant="destructive">Missed</Badge>;
  return <Badge variant="secondary">{v.status ?? "Scheduled"}</Badge>;
}

export function FamilyPortal() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [caregivers, setCaregivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, force] = useState(0);

  // tick every 30s for ETA / live indicators
  useEffect(() => { const t = setInterval(() => force((x) => x + 1), 30_000); return () => clearInterval(t); }, []);

  const load = async (clientIds?: string[]) => {
    if (!user) return;
    let ids = clientIds;
    if (!ids) {
      const { data: links } = await supabase.from("client_users").select("client_id").eq("user_id", user.id);
      ids = (links ?? []).map((l: any) => l.client_id);
    }
    if (!ids.length) { setLoading(false); return; }
    const [c, v, inv] = await Promise.all([
      supabase.from("clients").select("*").in("id", ids),
      supabase.from("visits").select("*").in("client_id", ids).order("date", { ascending: false }).limit(200),
      supabase.from("invoices").select("*").in("client_id", ids).order("created_at", { ascending: false }),
    ]);
    setClients(c.data ?? []);
    setVisits(v.data ?? []);
    setInvoices(inv.data ?? []);
    const visitIds = (v.data ?? []).map((x: any) => x.id);
    const cgIds = Array.from(new Set((v.data ?? []).map((x: any) => x.caregiver_id).filter(Boolean)));
    const [n, cg] = await Promise.all([
      visitIds.length ? supabase.from("visit_notes").select("*").in("visit_id", visitIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      cgIds.length ? supabase.from("caregivers").select("id, name, phone").in("id", cgIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    setNotes(n.data ?? []);
    setCaregivers(cg.data ?? []);
    setLoading(false);
    return ids;
  };

  useEffect(() => {
    if (!user) return;
    let cleanup: (() => void) | undefined;
    (async () => {
      const ids = await load();
      if (!ids?.length) return;
      const channel = supabase
        .channel("family-portal")
        .on("postgres_changes", { event: "*", schema: "public", table: "visits", filter: `client_id=in.(${ids.join(",")})` }, () => load(ids))
        .on("postgres_changes", { event: "*", schema: "public", table: "visit_notes" }, () => load(ids))
        .subscribe();
      cleanup = () => { supabase.removeChannel(channel); };
    })();
    return () => cleanup?.();
  }, [user]);

  const todaysVisits = useMemo(() => visits.filter((v) => v.date === today()), [visits]);
  const liveVisits = useMemo(() => todaysVisits.filter((v) => v.status === "In Progress" || v.status === "In-Progress"), [todaysVisits]);
  const upcoming = useMemo(() => todaysVisits.filter((v) => v.status === "Scheduled" && (timeToMinutes(v.start_time) ?? 0) >= nowMinutes()).sort((a, b) => (timeToMinutes(a.start_time) ?? 0) - (timeToMinutes(b.start_time) ?? 0)), [todaysVisits]);
  const cgById = (id: string) => caregivers.find((c) => c.id === id);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;
  if (!clients.length)
    return <Card><CardHeader><CardTitle>Family Portal</CardTitle></CardHeader><CardContent>No client is linked to your account yet. Please ask the agency to grant access.</CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg"><Heart className="h-6 w-6 text-primary-foreground" /></div>
          <div>
            <h1 className="text-2xl font-bold">Family Portal</h1>
            <p className="text-muted-foreground">Live care updates for your loved one</p>
          </div>
        </div>
        {liveVisits.length > 0 && (
          <Badge className="bg-success/15 text-success border-success/30 gap-1 text-sm py-1 px-3">
            <Radio className="h-3 w-3 animate-pulse" /> {liveVisits.length} caregiver{liveVisits.length > 1 ? "s" : ""} on shift
          </Badge>
        )}
      </div>

      <LegalDisclaimer variant="familyPortal" />

      {clients.map((c) => {
        const clientVisits = visits.filter((v) => v.client_id === c.id);
        const live = clientVisits.find((v) => (v.status === "In Progress" || v.status === "In-Progress") && v.date === today());
        const next = upcoming.find((v) => v.client_id === c.id);
        const liveCg = live ? cgById(live.caregiver_id) : null;
        const nextCg = next ? cgById(next.caregiver_id) : null;
        const etaMin = next ? Math.max(0, (timeToMinutes(next.start_time) ?? 0) - nowMinutes()) : null;

        return (
          <Card key={c.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">{c.name}</CardTitle>
                  <CardDescription>{c.care_level} care • {c.status}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* LIVE TRACKING BANNER */}
              {live ? (
                <section className="rounded-lg border-2 border-success/40 bg-success/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
                      </span>
                      <span className="font-semibold">{liveCg?.name ?? "Caregiver"} is with {c.name} now</span>
                    </div>
                    {liveCg?.phone && (
                      <a href={`tel:${liveCg.phone}`} className="text-sm text-primary inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Call
                      </a>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Clocked in {live.verified_start_time ?? live.start_time} • scheduled until {live.end_time}
                    {live.verification_status === "Verified" && <Badge variant="outline" className="ml-2 gap-1"><CheckCircle2 className="h-3 w-3 text-success" />GPS verified</Badge>}
                    {live.verification_status === "Pending-Review" && <Badge variant="outline" className="ml-2 gap-1"><AlertCircle className="h-3 w-3 text-warning" />Outside geofence</Badge>}
                  </div>
                  {(live.clock_in_lat && live.clock_in_lng) && (
                    <div className="h-56 rounded-md overflow-hidden border">
                      <MapContainer center={[Number(live.clock_in_lat), Number(live.clock_in_lng)]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {c.lat && c.lng && (
                          <CircleMarker center={[Number(c.lat), Number(c.lng)]} radius={10} pathOptions={{ color: "hsl(var(--primary))", fillColor: "hsl(var(--primary))", fillOpacity: 0.3 }}>
                            <Popup>{c.name}'s home</Popup>
                          </CircleMarker>
                        )}
                        <Marker position={[Number(live.clock_in_lat), Number(live.clock_in_lng)]}>
                          <Popup>{liveCg?.name ?? "Caregiver"} clocked in here</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  )}
                </section>
              ) : next ? (
                <section className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium">Next visit: {nextCg?.name ?? "TBD"}</span>
                    <span className="text-muted-foreground">at {next.start_time}</span>
                    {etaMin !== null && etaMin <= 120 && (
                      <Badge variant="outline" className="ml-auto">{etaMin === 0 ? "Starting now" : `in ${etaMin} min`}</Badge>
                    )}
                  </div>
                </section>
              ) : (
                <section className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  No more scheduled visits today.
                </section>
              )}

              {/* TODAY TIMELINE */}
              <section>
                <h3 className="font-semibold flex items-center gap-2 mb-2"><Calendar className="h-4 w-4" />Today</h3>
                <div className="space-y-2">
                  {todaysVisits.filter((v) => v.client_id === c.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">No visits scheduled today.</p>
                  )}
                  {todaysVisits.filter((v) => v.client_id === c.id).sort((a, b) => (timeToMinutes(a.start_time) ?? 0) - (timeToMinutes(b.start_time) ?? 0)).map((v) => {
                    const cg = cgById(v.caregiver_id);
                    return (
                      <div key={v.id} className="flex items-center justify-between border rounded p-2 text-sm">
                        <div>
                          <div>{v.start_time}–{v.end_time} • {cg?.name ?? "Caregiver"}</div>
                          {v.verified_start_time && <div className="text-xs text-muted-foreground">Verified in: {v.verified_start_time}{v.verified_end_time ? ` • out: ${v.verified_end_time}` : ""}</div>}
                        </div>
                        <VisitStatusPill v={v} />
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* RECENT VISITS */}
              <section>
                <h3 className="font-semibold flex items-center gap-2 mb-2"><Calendar className="h-4 w-4" />Recent Visits</h3>
                <div className="space-y-2">
                  {clientVisits.filter((v) => v.date !== today()).slice(0, 8).map((v) => (
                    <div key={v.id} className="flex justify-between text-sm border rounded p-2">
                      <span>{v.date} • {v.start_time}–{v.end_time} • {cgById(v.caregiver_id)?.name ?? "Caregiver"}</span>
                      <VisitStatusPill v={v} />
                    </div>
                  ))}
                </div>
              </section>

              {/* NOTES */}
              <section>
                <h3 className="font-semibold flex items-center gap-2 mb-2"><FileText className="h-4 w-4" />Latest Notes</h3>
                <div className="space-y-2 text-sm">
                  {notes.filter((n) => visits.find((v) => v.id === n.visit_id)?.client_id === c.id).slice(0, 5).map((n) => (
                    <div key={n.id} className="border rounded p-2">
                      <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                      {n.subjective && <p><b>Subjective:</b> {n.subjective}</p>}
                      {n.objective && <p><b>Objective:</b> {n.objective}</p>}
                      {n.assessment && <p><b>Assessment:</b> {n.assessment}</p>}
                      {n.plan && <p><b>Plan:</b> {n.plan}</p>}
                    </div>
                  ))}
                  {notes.filter((n) => visits.find((v) => v.id === n.visit_id)?.client_id === c.id).length === 0 && (
                    <p className="text-muted-foreground">No notes yet.</p>
                  )}
                </div>
              </section>

              {/* INVOICES */}
              <section>
                <h3 className="font-semibold flex items-center gap-2 mb-2"><Receipt className="h-4 w-4" />Invoices</h3>
                <div className="space-y-2 text-sm">
                  {invoices.filter((i) => i.client_id === c.id).map((i) => (
                    <div key={i.id} className="flex justify-between border rounded p-2">
                      <span>Due {new Date(i.due_date).toLocaleDateString()} • {Number(i.hours).toFixed(2)} hrs</span>
                      <span className="font-semibold">${Number(i.amount).toFixed(2)} <Badge variant="outline" className="ml-2">{i.status}</Badge></span>
                    </div>
                  ))}
                  {invoices.filter((i) => i.client_id === c.id).length === 0 && (
                    <p className="text-muted-foreground">No invoices yet.</p>
                  )}
                </div>
              </section>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}