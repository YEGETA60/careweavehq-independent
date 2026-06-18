import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ChevronRight } from "lucide-react";

export function Today() {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc("caregiver_today_visits");
      setVisits(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="px-4 pt-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </header>

      {loading && <div className="text-sm text-muted-foreground">Loading visits…</div>}
      {!loading && visits.length === 0 && (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          No visits scheduled today. Enjoy your day off!
        </Card>
      )}

      {visits.map((v) => {
        const isInProgress = v.status === "In Progress";
        const isDone = v.status === "Completed";
        return (
          <Link key={v.id} to={`/m/visit/${v.id}`}>
            <Card className="p-4 active:bg-accent/30 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{v.client_name}</h3>
                    {isInProgress && <Badge className="bg-success/15 text-success border-success/30">Live</Badge>}
                    {isDone && <Badge variant="outline">Done</Badge>}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground gap-1 mb-1">
                    <Clock className="h-3 w-3" />
                    {v.start_time}–{v.end_time}
                  </div>
                  {v.client_address && (
                    <div className="flex items-start text-xs text-muted-foreground gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                      <span className="truncate">{v.client_address}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}