import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";
import { EligibilityCheckPanel } from "@/components/EligibilityCheckPanel";

interface Payer { id: string; name: string; payer_type: string; payer_id_external?: string | null; contact_phone?: string | null; contact_email?: string | null; }
interface Authorization { id: string; client_id: string; payer_id: string; auth_number: string; service_code?: string | null; units_approved: number; unit_minutes: number; hourly_rate?: number | null; start_date: string; end_date: string; status: string; }

export function PayersAuthorizations() {
  const { clients } = useHomeCareContext();
  const [payers, setPayers] = useState<Payer[]>([]);
  const [auths, setAuths] = useState<Authorization[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [openPayer, setOpenPayer] = useState(false);
  const [openAuth, setOpenAuth] = useState(false);
  const [newPayer, setNewPayer] = useState({ name: "", payer_type: "Medicaid", payer_id_external: "", contact_phone: "", contact_email: "" });
  const [newAuth, setNewAuth] = useState({ client_id: "", payer_id: "", auth_number: "", service_code: "", units_approved: 0, unit_minutes: 60, hourly_rate: 0, start_date: "", end_date: "" });

  const refresh = useCallback(async () => {
    const [p, a] = await Promise.all([
      supabase.from("payers").select("*").order("name"),
      supabase.from("authorizations").select("*").order("end_date", { ascending: false }),
    ]);
    if (p.data) setPayers(p.data as Payer[]);
    if (a.data) {
      setAuths(a.data as Authorization[]);
      const u: Record<string, number> = {};
      await Promise.all(a.data.map(async (au: any) => {
        const { data } = await supabase.rpc("authorization_units_used", { _auth_id: au.id });
        u[au.id] = Number(data ?? 0);
      }));
      setUsage(u);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addPayer = async () => {
    if (!newPayer.name) return toast.error("Name required");
    const { error } = await supabase.from("payers").insert(newPayer);
    if (error) return toast.error(error.message);
    toast.success("Payer added");
    setOpenPayer(false);
    setNewPayer({ name: "", payer_type: "Medicaid", payer_id_external: "", contact_phone: "", contact_email: "" });
    refresh();
  };

  const addAuth = async () => {
    if (!newAuth.client_id || !newAuth.payer_id || !newAuth.auth_number || !newAuth.start_date || !newAuth.end_date) {
      return toast.error("Fill required fields");
    }
    const { error } = await supabase.from("authorizations").insert({
      ...newAuth,
      hourly_rate: newAuth.hourly_rate || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Authorization added");
    setOpenAuth(false);
    refresh();
  };

  const deactivate = async (id: string) => {
    await supabase.from("authorizations").update({ status: "Inactive" }).eq("id", id);
    refresh();
  };

  return (
    <div className="space-y-6">
      <EligibilityCheckPanel
        clients={(clients ?? []).map((c: any) => ({ id: c.id, name: c.name }))}
        payers={payers.map((p) => ({ id: p.id, name: p.name }))}
      />
      <Tabs defaultValue="auths">
        <TabsList>
          <TabsTrigger value="auths">Authorizations</TabsTrigger>
          <TabsTrigger value="payers">Payers</TabsTrigger>
        </TabsList>

        <TabsContent value="auths" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Service Authorizations</CardTitle>
                <CardDescription>Track approved units, dates, and usage per payer</CardDescription>
              </div>
              <Dialog open={openAuth} onOpenChange={setOpenAuth}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-1" />New authorization</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New authorization</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Client</Label>
                      <Select value={newAuth.client_id} onValueChange={(v) => setNewAuth({ ...newAuth, client_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Payer</Label>
                      <Select value={newAuth.payer_id} onValueChange={(v) => setNewAuth({ ...newAuth, payer_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
                        <SelectContent>{payers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Auth #</Label><Input value={newAuth.auth_number} onChange={(e) => setNewAuth({ ...newAuth, auth_number: e.target.value })} /></div>
                      <div><Label>Service code</Label><Input value={newAuth.service_code} onChange={(e) => setNewAuth({ ...newAuth, service_code: e.target.value })} /></div>
                      <div><Label>Units approved</Label><Input type="number" value={newAuth.units_approved} onChange={(e) => setNewAuth({ ...newAuth, units_approved: Number(e.target.value) })} /></div>
                      <div><Label>Unit minutes</Label><Input type="number" value={newAuth.unit_minutes} onChange={(e) => setNewAuth({ ...newAuth, unit_minutes: Number(e.target.value) })} /></div>
                      <div><Label>Hourly rate</Label><Input type="number" step="0.01" value={newAuth.hourly_rate} onChange={(e) => setNewAuth({ ...newAuth, hourly_rate: Number(e.target.value) })} /></div>
                      <div></div>
                      <div><Label>Start date</Label><Input type="date" value={newAuth.start_date} onChange={(e) => setNewAuth({ ...newAuth, start_date: e.target.value })} /></div>
                      <div><Label>End date</Label><Input type="date" value={newAuth.end_date} onChange={(e) => setNewAuth({ ...newAuth, end_date: e.target.value })} /></div>
                    </div>
                    <Button onClick={addAuth} className="w-full">Save authorization</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Auth #</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auths.map(a => {
                    const used = usage[a.id] ?? 0;
                    const pct = a.units_approved ? Math.min(100, (used / Number(a.units_approved)) * 100) : 0;
                    const over = used > Number(a.units_approved);
                    const expired = new Date(a.end_date) < new Date();
                    return (
                      <TableRow key={a.id}>
                        <TableCell>{clients.find(c => c.id === a.client_id)?.name ?? "—"}</TableCell>
                        <TableCell>{payers.find(p => p.id === a.payer_id)?.name ?? "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{a.auth_number}</TableCell>
                        <TableCell className="text-xs">
                          {a.start_date} → {a.end_date}
                          {expired && <Badge variant="destructive" className="ml-2">expired</Badge>}
                        </TableCell>
                        <TableCell className="w-48">
                          <div className="flex items-center gap-2">
                            <Progress value={pct} className="h-2" />
                            <span className="text-xs whitespace-nowrap">{used.toFixed(1)}/{Number(a.units_approved).toFixed(0)}</span>
                          </div>
                          {over && <div className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3" /> Over auth</div>}
                        </TableCell>
                        <TableCell>
                          {a.status === "Active" && <Button size="sm" variant="ghost" onClick={() => deactivate(a.id)}>Deactivate</Button>}
                          {a.status !== "Active" && <Badge variant="secondary">{a.status}</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {auths.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No authorizations yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payers</CardTitle>
                <CardDescription>Insurance/payer profiles</CardDescription>
              </div>
              <Dialog open={openPayer} onOpenChange={setOpenPayer}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New payer</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New payer</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Name</Label><Input value={newPayer.name} onChange={(e) => setNewPayer({ ...newPayer, name: e.target.value })} /></div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newPayer.payer_type} onValueChange={(v) => setNewPayer({ ...newPayer, payer_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Medicaid","Medicare","VA","LTC","Private","Self-Pay"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Payer ID</Label><Input value={newPayer.payer_id_external} onChange={(e) => setNewPayer({ ...newPayer, payer_id_external: e.target.value })} /></div>
                    <div><Label>Contact phone</Label><Input value={newPayer.contact_phone} onChange={(e) => setNewPayer({ ...newPayer, contact_phone: e.target.value })} /></div>
                    <div><Label>Contact email</Label><Input value={newPayer.contact_email} onChange={(e) => setNewPayer({ ...newPayer, contact_email: e.target.value })} /></div>
                    <Button onClick={addPayer} className="w-full">Save payer</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Payer ID</TableHead><TableHead>Contact</TableHead></TableRow></TableHeader>
                <TableBody>
                  {payers.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="secondary">{p.payer_type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{p.payer_id_external || "—"}</TableCell>
                      <TableCell className="text-xs">{p.contact_phone || p.contact_email || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {payers.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No payers yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}