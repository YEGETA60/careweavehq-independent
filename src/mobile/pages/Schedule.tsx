import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, ChevronRight } from "lucide-react";

type Visit = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  client_id: string;
  clients?: { name: string; address: string | null } | null;
};

function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
}
function fmtDay(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function Schedule() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0); // weeks from current

  useEffect(() => {
    (async () => {
      setLoading(true);
      const start = weekStart(new Date());
      start.setDate(start.getDate() + offset * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      const { data: me } = await supabase.auth.getUser();
      const uid = me.user?.id;
      if (!uid) { setVisits([]); setLoading(false); return; }

      const { data: cg } = await (supabase as any)
        .from("caregivers").select("id").eq("user_id", uid).maybeSingle();
      if (!cg?.id) { setVisits([]); setLoading(false); return; }

      const { data } = await (supabase as any)
        .from("visits")
        .select("id, date, start_time, end_time, status, client_id, clients(name, address)")
        .eq("caregiver_id", cg.id)
        .gte("date", toISO(start))
        .lte("date", toISO(end))
        .order("date")
        .order("start_time");
      setVisits((data as Visit[]) ?? []);
      setLoading(false);
    })();
  }, [offset]);

  const start = weekStart(new Date());
  start.setDate(start.getDate() + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="px-4 pt-6 space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            {fmtDay(days[0])} – {fmtDay(days[6])}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setOffset((o) => o - 1)}
            className="px-2.5 py-1.5 text-sm rounded-md border hover:bg-accent"
          >Prev</button>
          <button
            onClick={() => setOffset(0)}
            className="px-2.5 py-1.5 text-sm rounded-md border hover:bg-accent"
          >This week</button>
          <button
            onClick={() => setOffset((o) => o + 1)}
            className="px-2.5 py-1.5 text-sm rounded-md border hover:bg-accent"
          >Next</button>
        </div>
      </header>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!loading && days.map((d) => {
        const iso = toISO(d);
        const dayVisits = visits.filter((v) => v.date === iso);
        return (
          <div key={iso}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">{fmtDay(d)}</div>
            {dayVisits.length === 0 && (
              <Card className="p-3 text-xs text-muted-foreground">No visits scheduled.</Card>
            )}
            <div className="space-y-2">
              {dayVisits.map((v) => {
                const isDone = v.status === "Completed";
                const isLive = v.status === "In Progress";
                return (
                  <Link key={v.id} to={`/m/visit/${v.id}`}>
                    <Card className="p-3 active:bg-accent/30 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{v.clients?.name ?? "Client"}</h3>
                            {isLive && <Badge className="bg-success/15 text-success border-success/30">Live</Badge>}
                            {isDone && <Badge variant="outline">Done</Badge>}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <Clock className="h-3 w-3" />
                            {v.start_time}–{v.end_time}
                          </div>
                          {v.clients?.address && (
                            <div className="flex items-start text-xs text-muted-foreground gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="truncate">{v.clients.address}</span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}