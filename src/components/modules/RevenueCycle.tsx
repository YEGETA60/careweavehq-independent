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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Receipt, Plus, AlertTriangle, TrendingUp, FileWarning, DollarSign, RefreshCw } from "lucide-react";

type Claim = any;
type Rate = any;
type Remit = any;
type Denial = any;
type AuthAlert = any;

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  accepted: "bg-primary/10 text-primary",
  paid: "bg-success/10 text-success",
  partial: "bg-warning/10 text-warning",
  denied: "bg-destructive/10 text-destructive",
  appealed: "bg-warning/10 text-warning",
  rejected: "bg-destructive/10 text-destructive",
  closed: "bg-muted text-muted-foreground",
};

export function RevenueCycle() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [remits, setRemits] = useState<Remit[]>([]);
  const [denials, setDenials] = useState<Denial[]>([]);
  const [alerts, setAlerts] = useState<AuthAlert[]>([]);
  const [aging, setAging] = useState<any[]>([]);
  const [payers, setPayers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [auths, setAuths] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [openClaim, setOpenClaim] = useState(false);
  const [openRate, setOpenRate] = useState(false);
  const [openRemit, setOpenRemit] = useState(false);
  const [newClaim, setNewClaim] = useState({ client_id: "", payer_id: "", authorization_id: "", service_start: "", service_end: "", total_units: 0, total_charge: 0, claim_number: "" });
  const [newRate, setNewRate] = useState({ payer_id: "", service_code: "", description: "", hourly_rate: 0, unit_minutes: 60, effective_start: new Date().toISOString().slice(0,10) });
  const [newRemit, setNewRemit] = useState({ payer_id: "", remit_number: "", check_or_eft_number: "", payment_date: new Date().toISOString().slice(0,10), payment_method: "EFT", total_paid: 0 });

  const refresh = useCallback(async () => {
    setLoading(true);
    const sb = supabase as any;
    const [c, r, rm, d, a, p, cl, au] = await Promise.all([
      sb.from("claims").select("*").order("created_at", { ascending: false }).limit(200),
      sb.from("payer_rate_sheets").select("*").order("effective_start", { ascending: false }),
      sb.from("remittances").select("*").order("payment_date", { ascending: false }).limit(100),
      sb.from("claim_denials").select("*").order("denial_date", { ascending: false }).limit(100),
      sb.from("authorization_alerts").select("*").is("acknowledged_at", null).order("created_at", { ascending: false }),
      sb.from("payers").select("id,name").order("name"),
      sb.from("clients").select("id,name").order("name"),
      sb.from("authorizations").select("id,auth_number,client_id,payer_id,units_approved,end_date").eq("status", "Active"),
    ]);
    setClaims(c.data ?? []);
    setRates(r.data ?? []);
    setRemits(rm.data ?? []);
    setDenials(d.data ?? []);
    setAlerts(a.data ?? []);
    setPayers(p.data ?? []);
    setClients(cl.data ?? []);
    setAuths(au.data ?? []);

    const { data: prof } = await sb.from("profiles").select("default_company_id").maybeSingle();
    if (prof?.default_company_id) {
      const { data: ag } = await sb.rpc("claim_aging_buckets", { _company: prof.default_company_id });
      setAging(ag ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const runBurndownCheck = async () => {
    const { data, error } = await (supabase as any).rpc("auth_burndown_check");
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} new alerts created`);
    refresh();
  };

  const ackAlert = async (id: string) => {
    const { error } = await (supabase as any).from("authorization_alerts").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const createClaim = async () => {
    if (!newClaim.client_id || !newClaim.payer_id || !newClaim.claim_number || !newClaim.service_start || !newClaim.service_end) {
      return toast.error("Required fields missing");
    }
    const { error } = await (supabase as any).from("claims").insert({ ...newClaim, status: "draft" });
    if (error) return toast.error(error.message);
    toast.success("Claim drafted");
    setOpenClaim(false);
    setNewClaim({ client_id: "", payer_id: "", authorization_id: "", service_start: "", service_end: "", total_units: 0, total_charge: 0, claim_number: "" });
    refresh();
  };

  const submitClaim = async (id: string) => {
    const { error } = await (supabase as any).from("claims").update({ status: "submitted", submission_date: new Date().toISOString().slice(0,10) }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked submitted (837)");
    refresh();
  };

  const export837 = (claim: Claim) => {
    const lines = [
      `ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       *${new Date().toISOString().slice(2,10).replace(/-/g,"")}*0000*^*00501*000000001*0*P*:~`,
      `GS*HC*SUB*REC*${new Date().toISOString().slice(0,10).replace(/-/g,"")}*0000*1*X*005010X222A1~`,
      `ST*837*0001*005010X222A1~`,
      `BHT*0019*00*${claim.claim_number}*${new Date().toISOString().slice(0,10).replace(/-/g,"")}*0000*CH~`,
      `CLM*${claim.claim_number}*${claim.total_charge}***11:B:1*Y*A*Y*Y~`,
      `DTP*434*RD8*${(claim.service_start||"").replace(/-/g,"")}-${(claim.service_end||"").replace(/-/g,"")}~`,
      `SE*6*0001~`,
      `GE*1*1~`,
      `IEA*1*000000001~`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `claim-${claim.claim_number}-837.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const addRate = async () => {
    if (!newRate.payer_id || !newRate.service_code) return toast.error("Payer and service code required");
    const { error } = await (supabase as any).from("payer_rate_sheets").insert(newRate);
    if (error) return toast.error(error.message);
    toast.success("Rate added");
    setOpenRate(false);
    refresh();
  };

  const addRemit = async () => {
    if (!newRemit.payer_id || !newRemit.remit_number) return toast.error("Payer and remit # required");
    const { error } = await (supabase as any).from("remittances").insert({ ...newRemit, posted_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Remittance posted");
    setOpenRemit(false);
    setNewRemit({ payer_id: "", remit_number: "", check_or_eft_number: "", payment_date: new Date().toISOString().slice(0,10), payment_method: "EFT", total_paid: 0 });
    refresh();
  };

  const payerName = (id: string) => payers.find(p => p.id === id)?.name ?? "—";
  const clientName = (id: string) => clients.find(c => c.id === id)?.name ?? "—";

  const totals = {
    outstanding: aging.reduce((s, b) => s + Number(b.total_outstanding || 0), 0),
    paid: claims.reduce((s, c) => s + Number(c.total_paid || 0), 0),
    denials: denials.filter(d => d.appeal_status === "none" || d.appeal_status === "drafted").length,
    alerts: alerts.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
            <Receipt className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Revenue Cycle</h1>
            <p className="text-muted-foreground">EDI 837/835, denials, aging, rate sheets & authorization alerts</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />Outstanding A/R</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${totals.outstanding.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" />Total Paid</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${totals.paid.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileWarning className="h-4 w-4 text-destructive" />Open Denials</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.denials}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Auth Alerts</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totals.alerts}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="claims" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="claims">Claims (837)</TabsTrigger>
          <TabsTrigger value="aging">Aging A/R</TabsTrigger>
          <TabsTrigger value="remits">Remittances (835)</TabsTrigger>
          <TabsTrigger value="denials">Denials & Appeals</TabsTrigger>
          <TabsTrigger value="rates">Rate Sheets</TabsTrigger>
          <TabsTrigger value="alerts">Auth Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="claims">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Claims</CardTitle>
                <CardDescription>Draft, submit and track 837 claims</CardDescription>
              </div>
              <Dialog open={openClaim} onOpenChange={setOpenClaim}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New Claim</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>New Claim</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Claim #</Label><Input value={newClaim.claim_number} onChange={e => setNewClaim({ ...newClaim, claim_number: e.target.value })} /></div>
                    <div><Label>Client</Label>
                      <Select value={newClaim.client_id} onValueChange={v => setNewClaim({ ...newClaim, client_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                        <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Payer</Label>
                      <Select value={newClaim.payer_id} onValueChange={v => setNewClaim({ ...newClaim, payer_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
                        <SelectContent>
                          {payers.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                              No payers yet. Add them in <span className="font-medium">Payers &amp; Authorizations</span>.
                            </div>
                          )}
                          {payers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Service start</Label><Input type="date" value={newClaim.service_start} onChange={e => setNewClaim({ ...newClaim, service_start: e.target.value })} /></div>
                      <div><Label>Service end</Label><Input type="date" value={newClaim.service_end} onChange={e => setNewClaim({ ...newClaim, service_end: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Units</Label><Input type="number" value={newClaim.total_units} onChange={e => setNewClaim({ ...newClaim, total_units: Number(e.target.value) })} /></div>
                      <div><Label>Total charge</Label><Input type="number" step="0.01" value={newClaim.total_charge} onChange={e => setNewClaim({ ...newClaim, total_charge: Number(e.target.value) })} /></div>
                    </div>
                    <Button className="w-full" onClick={createClaim}>Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Claim #</TableHead><TableHead>Client</TableHead><TableHead>Payer</TableHead><TableHead>Service</TableHead><TableHead>Charge</TableHead><TableHead>Paid</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {claims.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.claim_number}</TableCell>
                      <TableCell>{clientName(c.client_id)}</TableCell>
                      <TableCell>{payerName(c.payer_id)}</TableCell>
                      <TableCell className="text-xs">{c.service_start} → {c.service_end}</TableCell>
                      <TableCell>${Number(c.total_charge).toFixed(2)}</TableCell>
                      <TableCell>${Number(c.total_paid).toFixed(2)}</TableCell>
                      <TableCell><Badge className={STATUS_COLOR[c.status] ?? ""} variant="outline">{c.status}</Badge></TableCell>
                      <TableCell className="text-right space-x-1">
                        {c.status === "draft" && <Button size="sm" variant="outline" onClick={() => submitClaim(c.id)}>Submit</Button>}
                        <Button size="sm" variant="ghost" onClick={() => export837(c)}>837</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {claims.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No claims yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging">
          <Card>
            <CardHeader><CardTitle>Accounts Receivable Aging</CardTitle><CardDescription>Outstanding balances by age</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {aging.map((b: any) => (
                  <Card key={b.bucket} className="border">
                    <CardHeader className="pb-2"><CardTitle className="text-sm">{b.bucket} days</CardTitle></CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${Number(b.total_outstanding).toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">{b.claim_count} claims</div>
                    </CardContent>
                  </Card>
                ))}
                {aging.length === 0 && <div className="text-muted-foreground col-span-full text-center py-8">No outstanding A/R</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="remits">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Remittances (835)</CardTitle><CardDescription>Insurance payments received</CardDescription></div>
              <Dialog open={openRemit} onOpenChange={setOpenRemit}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Post Remit</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Post Remittance</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Payer</Label>
                      <Select value={newRemit.payer_id} onValueChange={v => setNewRemit({ ...newRemit, payer_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
                        <SelectContent>{payers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Remit #</Label><Input value={newRemit.remit_number} onChange={e => setNewRemit({ ...newRemit, remit_number: e.target.value })} /></div>
                    <div><Label>Check / EFT #</Label><Input value={newRemit.check_or_eft_number} onChange={e => setNewRemit({ ...newRemit, check_or_eft_number: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Date</Label><Input type="date" value={newRemit.payment_date} onChange={e => setNewRemit({ ...newRemit, payment_date: e.target.value })} /></div>
                      <div><Label>Amount</Label><Input type="number" step="0.01" value={newRemit.total_paid} onChange={e => setNewRemit({ ...newRemit, total_paid: Number(e.target.value) })} /></div>
                    </div>
                    <Button className="w-full" onClick={addRemit}>Post</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Payer</TableHead><TableHead>Remit #</TableHead><TableHead>Check/EFT</TableHead><TableHead>Method</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {remits.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.payment_date}</TableCell>
                      <TableCell>{payerName(r.payer_id)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.remit_number}</TableCell>
                      <TableCell className="font-mono text-xs">{r.check_or_eft_number}</TableCell>
                      <TableCell>{r.payment_method}</TableCell>
                      <TableCell>${Number(r.total_paid).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {remits.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No remittances posted</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="denials">
          <Card>
            <CardHeader><CardTitle>Denials & Appeals</CardTitle><CardDescription>Track denied claims and appeal workflow</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Code</TableHead><TableHead>Reason</TableHead><TableHead>Appeal Status</TableHead><TableHead>Appeal Submitted</TableHead></TableRow></TableHeader>
                <TableBody>
                  {denials.map(d => (
                    <TableRow key={d.id}>
                      <TableCell>{d.denial_date}</TableCell>
                      <TableCell className="font-mono text-xs">{d.denial_code}</TableCell>
                      <TableCell className="max-w-xs truncate">{d.denial_reason}</TableCell>
                      <TableCell><Badge variant="outline">{d.appeal_status}</Badge></TableCell>
                      <TableCell>{d.appeal_submitted_date ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {denials.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No denials recorded</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Per-Payer Rate Sheets</CardTitle><CardDescription>Negotiated rates by service code</CardDescription></div>
              <Dialog open={openRate} onOpenChange={setOpenRate}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Rate</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Rate</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Payer</Label>
                      <Select value={newRate.payer_id} onValueChange={v => setNewRate({ ...newRate, payer_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select payer" /></SelectTrigger>
                        <SelectContent>{payers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Service code</Label><Input value={newRate.service_code} onChange={e => setNewRate({ ...newRate, service_code: e.target.value })} placeholder="T1019" /></div>
                    <div><Label>Description</Label><Input value={newRate.description} onChange={e => setNewRate({ ...newRate, description: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Hourly rate</Label><Input type="number" step="0.01" value={newRate.hourly_rate} onChange={e => setNewRate({ ...newRate, hourly_rate: Number(e.target.value) })} /></div>
                      <div><Label>Unit minutes</Label><Input type="number" value={newRate.unit_minutes} onChange={e => setNewRate({ ...newRate, unit_minutes: Number(e.target.value) })} /></div>
                    </div>
                    <div><Label>Effective start</Label><Input type="date" value={newRate.effective_start} onChange={e => setNewRate({ ...newRate, effective_start: e.target.value })} /></div>
                    <Button className="w-full" onClick={addRate}>Add</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Payer</TableHead><TableHead>Service</TableHead><TableHead>Description</TableHead><TableHead>Rate</TableHead><TableHead>Unit (min)</TableHead><TableHead>Effective</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rates.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{payerName(r.payer_id)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.service_code}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>${Number(r.hourly_rate).toFixed(2)}</TableCell>
                      <TableCell>{r.unit_minutes}</TableCell>
                      <TableCell className="text-xs">{r.effective_start}{r.effective_end ? ` → ${r.effective_end}` : ""}</TableCell>
                    </TableRow>
                  ))}
                  {rates.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No rate sheets yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Authorization Alerts</CardTitle><CardDescription>Burn-down thresholds & expirations</CardDescription></div>
              <Button size="sm" variant="outline" onClick={runBurndownCheck}><RefreshCw className="h-4 w-4 mr-1" />Run Check</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Created</TableHead><TableHead>Type</TableHead><TableHead>Auth</TableHead><TableHead>Used / Approved</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {alerts.map(a => {
                    const auth = auths.find(x => x.id === a.authorization_id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-warning/10 text-warning">{a.alert_type}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{auth?.auth_number ?? a.authorization_id.slice(0,8)}</TableCell>
                        <TableCell>{a.units_used != null ? `${Number(a.units_used).toFixed(1)} / ${Number(a.units_approved).toFixed(1)}` : "—"}</TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => ackAlert(a.id)}>Acknowledge</Button></TableCell>
                      </TableRow>
                    );
                  })}
                  {alerts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No active alerts. Click "Run Check" to scan authorizations.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}