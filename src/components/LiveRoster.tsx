import { useMemo } from "react";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500",
];

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function fmtTime(t?: string) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}

function minutesBetween(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
}

export function LiveRoster() {
  const { visits, caregivers, clients } = useHomeCareContext();
  const todays = useMemo(() => visits.filter((v) => v.date === today()), [visits]);

  const rows = todays.map((v, idx) => {
    const cg = caregivers.find((c) => c.id === v.caregiverId);
    const cl = clients.find((c) => c.id === v.clientId);
    const name = cg?.name ?? "Unknown";
    const scheduledStart = v.startTime;
    const actualStart = v.clockInLocation ? (v.verifiedStartTime || v.startTime) : null;
    let status: "clocked" | "break" | "late" | "absent" = "absent";
    if (v.status === "In-Progress") status = "clocked";
    if (v.status === "Completed") status = "clocked";
    if (v.status === "Scheduled" && !actualStart) status = "absent";
    // Late: clocked-in after scheduled start
    let lateMin = 0;
    if (actualStart && scheduledStart && actualStart > scheduledStart) {
      lateMin = minutesBetween(scheduledStart, actualStart);
      if (lateMin >= 5) status = "late";
    }
    const hours = actualStart && v.endTime ? minutesBetween(actualStart, v.endTime) : 0;
    return {
      id: v.id,
      name,
      client: cl?.name ?? "—",
      actualStart,
      status,
      hours,
      lateMin,
      color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
    };
  });

  const clockedIn = rows.filter((r) => r.status === "clocked" || r.status === "late").length;
  const late = rows.filter((r) => r.status === "late").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const avgHours = rows.length
    ? rows.reduce((s, r) => s + r.hours, 0) / Math.max(rows.length, 1) / 60
    : 0;
  const projected = rows.length ? (avgHours * rows.length) / Math.max(clockedIn || 1, 1) : 0;

  const dateLabel = new Date().toLocaleDateString(undefined, {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Clocked In" value={String(clockedIn)} sub={`of ${rows.length} scheduled`} tone="success" />
        <StatCard label="Late Today" value={String(late)} sub="> 5 min past shift" tone="warning" />
        <StatCard label="Absent" value={String(absent)} sub="no clock-in" tone="destructive" />
        <StatCard label="Avg Hours Today" value={`${avgHours.toFixed(1)}h`} sub={`projected ${projected.toFixed(1)}h`} tone="foreground" />
      </div>

      {/* Live Roster */}
      <Card className="overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-3">
          <h2 className="text-lg font-semibold">Live Roster</h2>
          <span className="text-sm text-muted-foreground">· {dateLabel}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-y bg-muted/30">
                <th className="text-left font-medium px-5 py-2">Employee</th>
                <th className="text-left font-medium px-3 py-2">Status</th>
                <th className="text-left font-medium px-3 py-2">Clock In</th>
                <th className="text-left font-medium px-3 py-2">Location</th>
                <th className="text-left font-medium px-5 py-2">Hours</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No visits scheduled today.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full ${r.color} text-white text-xs font-semibold flex items-center justify-center`}>
                        {initials(r.name)}
                      </div>
                      <span className="font-medium">{r.name}</span>
                    </div>
                  </td>
                   <td className="px-3 py-3"><StatusBadge status={r.status} lateMin={r.lateMin} /></td>
                  <td className="px-3 py-3 tabular-nums">{r.actualStart ? fmtTime(r.actualStart) : "—"}</td>
                  <td className="px-3 py-3">
                    {r.actualStart ? (
                       <button className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium hover:bg-primary/15 whitespace-nowrap">
                        <MapPin className="h-3 w-3" /> View
                      </button>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-foreground/80">
                    {r.hours > 0 ? `${Math.floor(r.hours / 60)}h ${r.hours % 60}m` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "success" | "warning" | "destructive" | "foreground" }) {
  const valueColor = {
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    destructive: "text-rose-600 dark:text-rose-400",
    foreground: "text-foreground",
  }[tone];
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-3xl font-bold tabular-nums ${valueColor}`}>{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}

function StatusBadge({ status, lateMin = 0 }: { status: "clocked" | "break" | "late" | "absent"; lateMin?: number }) {
  const map = {
    clocked: { label: "Clocked In", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300", dot: "bg-emerald-500" },
    break:   { label: "On Break",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300", dot: "bg-amber-500" },
    late:    { label: lateMin > 0 ? `Late (${lateMin}m)` : "Late", cls: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300", dot: "bg-rose-500" },
    absent:  { label: "Not Clocked In", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${map.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${map.dot}`} />
      {map.label}
    </span>
  );
}