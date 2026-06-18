import { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Clock, CheckCircle2, AlertCircle } from "lucide-react";

// Fix default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const today = () => new Date().toISOString().slice(0, 10);

export function LiveMap() {
  const { visits, caregivers, clients } = useHomeCareContext();

  // Today's visits with a clock-in (currently checked in or recently completed)
  const todays = useMemo(() => visits.filter(v => v.date === today()), [visits]);
  const checkedIn = useMemo(() => todays.filter(v => v.clockInLocation && (v.status === "In-Progress" || v.status === "Completed")), [todays]);

  const points = checkedIn.map(v => {
    const cg = caregivers.find(c => c.id === v.caregiverId);
    const cl = clients.find(c => c.id === v.clientId);
    const live = v.status === "In-Progress";
    return {
      id: v.id,
      lat: live ? v.clockInLocation!.lat : (v.clockOutLocation?.lat ?? v.clockInLocation!.lat),
      lng: live ? v.clockInLocation!.lng : (v.clockOutLocation?.lng ?? v.clockInLocation!.lng),
      caregiver: cg?.name ?? "Unknown",
      client: cl?.name ?? "Unknown",
      status: v.status,
      verification: v.verificationStatus ?? "Unverified",
      startTime: v.verifiedStartTime || v.startTime,
      endTime: v.verifiedEndTime || v.endTime,
      live,
    };
  });

  const center: [number, number] = points.length
    ? [points.reduce((s, p) => s + p.lat, 0) / points.length, points.reduce((s, p) => s + p.lng, 0) / points.length]
    : [40.7128, -74.006]; // NYC default

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center justify-center sm:justify-start gap-2"><MapPin className="h-6 w-6 sm:h-8 sm:w-8" /> Live Map</h2>
        <p className="text-muted-foreground mt-1">Caregivers checked in today (EVV clock-in locations)</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">On shift now</div><div className="stat-value">{points.filter(p => p.live).length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Completed today</div><div className="stat-value">{points.filter(p => !p.live).length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total visits today</div><div className="stat-value">{todays.length}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Not yet started</div><div className="stat-value">{todays.filter(v => v.status === "Scheduled").length}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-340px)] min-h-[500px]">
        <Card className="lg:col-span-2 overflow-hidden">
          <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.map(p => (
              <div key={p.id}>
                <CircleMarker
                  center={[p.lat, p.lng]}
                  radius={p.live ? 14 : 10}
                  pathOptions={{
                    color: p.live ? "#22c55e" : "#64748b",
                    fillColor: p.live ? "#22c55e" : "#94a3b8",
                    fillOpacity: p.live ? 0.5 : 0.4,
                    weight: 2,
                  }}
                />
                <Marker position={[p.lat, p.lng]}>
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <div className="font-semibold">{p.caregiver}</div>
                      <div className="text-muted-foreground">at {p.client}</div>
                      <div>{p.startTime} – {p.endTime}</div>
                      <div>Status: <strong>{p.status}</strong></div>
                      <div>EVV: {p.verification}</div>
                    </div>
                  </Popup>
                </Marker>
              </div>
            ))}
          </MapContainer>
        </Card>

        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Caregivers</CardTitle>
            <CardDescription>Live = currently clocked in</CardDescription>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-2 p-3">
              {points.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No clock-ins yet today</p>}
              {points.map(p => (
                <div key={p.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{p.caregiver}</div>
                      <div className="text-xs text-muted-foreground truncate">at {p.client}</div>
                    </div>
                    {p.live ? (
                      <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
                        <span className="h-2 w-2 rounded-full bg-green-500 mr-1 animate-pulse" />Live
                      </Badge>
                    ) : (
                      <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Done</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.startTime}–{p.endTime}</span>
                    {p.verification !== "Verified" && p.verification !== "Manual-Override" && (
                      <span className="flex items-center gap-1 text-amber-600"><AlertCircle className="h-3 w-3" />{p.verification}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}