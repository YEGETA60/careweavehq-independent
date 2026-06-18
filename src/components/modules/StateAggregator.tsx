import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Network, Plus, RefreshCw, RotateCw, Activity, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

type Connection = {
  id: string;
  vendor: string;
  state: string;
  environment: "test" | "prod";
  agency_id: string | null;
  provider_id: string | null;
  api_base_url: string | null;
  status: "inactive" | "active" | "error";
  last_handshake_at: string | null;
  last_error: string | null;
};

type OutboundEvent = {
  id: string;
  event_type: string;
  source_table: string;
  source_id: string;
  status: string;
  attempts: number;
  next_attempt_at: string;
  vendor_ack_id: string | null;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
};

const VENDORS = [
  { id: "hhax", label: "HHAeXchange" },
  { id: "sandata", label: "Sandata" },
  { id: "tellus", label: "Tellus / Netsmart" },
  { id: "authenticare", label: "AuthentiCare" },
];

const STATES = ["NY", "NJ", "IL", "KS", "CT", "MA", "RI", "NH", "NC", "OH", "PA", "FL", "AL", "TX"];

export function StateAggregator() {
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [events, setEvents] = useState<OutboundEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    vendor: "hhax",
    state: "NY",
    environment: "test" as "test" | "prod",
    agency_id: "",
    provider_id: "",
    api_base_url: "",
    api_key_secret_ref: "",
  });

  const refresh = async () => {
    setLoading(true);
    const [{ data: c }, { data: e }] = await Promise.all([
      (supabase as any).from("aggregator_connections")
        .select("id, vendor, state, environment, agency_id, provider_id, api_base_url, status, last_handshake_at, last_error")
        .order("created_at", { ascending: false }),
      (supabase as any).from("aggregator_outbound_events").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setConnections((c ?? []) as Connection[]);
    setEvents((e ?? []) as OutboundEvent[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, sent: 0, accepted: 0, rejected: 0, retry: 0, dead_letter: 0 };
    for (const ev of events) counts[ev.status] = (counts[ev.status] ?? 0) + 1;
    return counts;
  }, [events]);

  const createConnection = async () => {
    setBusy(true);
    const { error } = await (supabase as any).from("aggregator_connections").insert({
      vendor: form.vendor,
      state: form.state,
      environment: form.environment,
      agency_id: form.agency_id || null,
      provider_id: form.provider_id || null,
      api_base_url: form.api_base_url || null,
      api_key_secret_ref: form.api_key_secret_ref || null,
      status: "inactive",
    });
    setBusy(false);
    if (error) {
      toast({ title: "Failed to create connection", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Connection created", description: "Activate it once credentials are verified." });
    setShowNew(false);
    refresh();
  };

  const setActive = async (id: string, status: "active" | "inactive") => {
    const { error } = await (supabase as any).from("aggregator_connections").update({ status }).eq("id", id);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    refresh();
  };

  const runPush = async () => {
    const { data, error } = await supabase.functions.invoke("aggregator-push", { body: {} });
    if (error) toast({ title: "Push failed", description: error.message, variant: "destructive" });
    else toast({ title: "Push complete", description: `Processed ${(data as any)?.processed ?? 0}, accepted ${(data as any)?.accepted ?? 0}` });
    refresh();
  };

  const retryEvent = async (id: string) => {
    const { error } = await (supabase as any).from("aggregator_outbound_events").update({
      status: "pending", next_attempt_at: new Date().toISOString(),
    }).eq("id", id);
    if (!error) refresh();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { v: "default" | "secondary" | "destructive" | "outline"; icon?: any }> = {
      pending: { v: "secondary", icon: Clock },
      sending: { v: "secondary", icon: Activity },
      sent: { v: "secondary", icon: Activity },
      accepted: { v: "default", icon: CheckCircle2 },
      rejected: { v: "destructive", icon: AlertTriangle },
      retry: { v: "outline", icon: RotateCw },
      dead_letter: { v: "destructive", icon: AlertTriangle },
    };
    const m = map[s] ?? { v: "outline" as const };
    const Icon = m.icon;
    return <Badge variant={m.v as any} className="gap-1">{Icon && <Icon className="h-3 w-3" />}{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6" /> State Aggregator
          </h1>
          <p className="text-muted-foreground text-sm">Send EVV-verified visits to HHAeXchange / Sandata / Tellus.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refresh}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button onClick={runPush}><RotateCw className="h-4 w-4 mr-1" /> Run Push</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {(["pending", "sent", "accepted", "rejected", "retry", "dead_letter"] as const).map((k) => (
          <Card key={k}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground capitalize">{k.replace("_", " ")}</div>
              <div className="text-2xl font-bold mt-1">{stats[k] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="connections">
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowNew((v) => !v)} variant={showNew ? "outline" : "default"}>
              <Plus className="h-4 w-4 mr-1" /> {showNew ? "Cancel" : "New connection"}
            </Button>
          </div>

          {showNew && (
            <Card>
              <CardHeader><CardTitle className="text-base">Create connection</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Vendor</Label>
                  <Select value={form.vendor} onValueChange={(v) => setForm((f) => ({ ...f, vendor: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VENDORS.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>State</Label>
                  <Select value={form.state} onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Environment</Label>
                  <Select value={form.environment} onValueChange={(v) => setForm((f) => ({ ...f, environment: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="prod">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Agency ID</Label>
                  <Input value={form.agency_id} onChange={(e) => setForm((f) => ({ ...f, agency_id: e.target.value }))} />
                </div>
                <div>
                  <Label>Provider ID</Label>
                  <Input value={form.provider_id} onChange={(e) => setForm((f) => ({ ...f, provider_id: e.target.value }))} />
                </div>
                <div>
                  <Label>API Base URL (optional override)</Label>
                  <Input placeholder="https://api.test.hhaexchange.com/v1"
                    value={form.api_base_url} onChange={(e) => setForm((f) => ({ ...f, api_base_url: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>API Key secret name</Label>
                  <Input placeholder="HHAX_API_KEY"
                    value={form.api_key_secret_ref} onChange={(e) => setForm((f) => ({ ...f, api_key_secret_ref: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Name of the backend secret holding your vendor API key. Leave blank to run in mock mode (test environment).
                  </p>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button onClick={createConnection} disabled={busy}>Create</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Env</TableHead>
                    <TableHead>Agency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last sync</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Loading…</TableCell></TableRow>}
                  {!loading && connections.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No connections yet.</TableCell></TableRow>
                  )}
                  {connections.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium uppercase">{c.vendor}</TableCell>
                      <TableCell>{c.state}</TableCell>
                      <TableCell><Badge variant="outline">{c.environment}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.agency_id ?? "—"}</TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-xs">{c.last_handshake_at ? new Date(c.last_handshake_at).toLocaleString() : "Never"}</TableCell>
                      <TableCell className="text-right">
                        {c.status === "active"
                          ? <Button size="sm" variant="outline" onClick={() => setActive(c.id, "inactive")}>Deactivate</Button>
                          : <Button size="sm" onClick={() => setActive(c.id, "active")}>Activate</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Vendor Ack</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No events yet — verify a visit on a payer with “requires aggregator” enabled.</TableCell></TableRow>
                  )}
                  {events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="text-xs">{new Date(ev.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{ev.event_type}</TableCell>
                      <TableCell className="text-xs font-mono">{ev.source_table}/{ev.source_id.slice(0, 8)}</TableCell>
                      <TableCell>{statusBadge(ev.status)}</TableCell>
                      <TableCell>{ev.attempts}</TableCell>
                      <TableCell className="text-xs font-mono">{ev.vendor_ack_id ?? "—"}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[200px] truncate">{ev.last_error ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {(ev.status === "rejected" || ev.status === "dead_letter" || ev.status === "retry") && (
                          <Button size="sm" variant="outline" onClick={() => retryEvent(ev.id)}>Retry now</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}