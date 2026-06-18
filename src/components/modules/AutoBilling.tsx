import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap, AlertTriangle, CheckCircle2, RefreshCw, Send, FileText, Bell } from "lucide-react";
import { PrebillReviewQueue } from "@/components/PrebillReviewQueue";
import { PrebillOverrideLimits } from "@/components/PrebillOverrideLimits";

function startOfWeek(d = new Date()) {
  const x = new Date(d); const day = x.getDay(); const diff = (day + 6) % 7; // Monday
  x.setDate(x.getDate() - diff - 7); return x.toISOString().slice(0, 10);
}
function endOfPrevWeek() {
  const start = new Date(startOfWeek()); start.setDate(start.getDate() + 6);
  return start.toISOString().slice(0, 10);
}

export function AutoBilling() {
  const [periodStart, setPeriodStart] = useState(startOfWeek());
  const [periodEnd, setPeriodEnd] = useState(endOfPrevWeek());
  const [strict, setStrict] = useState(true);
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [unpaidCount, setUnpaidCount] = useState(0);

  const loadRuns = useCallback(async () => {
    const { data } = await (supabase as any).from("billing_runs").select("*").order("created_at", { ascending: false }).limit(20);
    setRuns(data ?? []);
    const { count } = await (supabase as any).from("invoices").select("id", { count: "exact", head: true }).neq("status", "Paid");
    setUnpaidCount(count ?? 0);
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const runPreview = async (mode: "preview" | "commit") => {
    setRunning(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("auto-billing-run", {
        body: { period_start: periodStart, period_end: periodEnd, mode, strict },
      });
      if (error) throw error;
      setPreview(data);
      toast.success(
        mode === "commit"
          ? `Generated ${data.summary.invoices_created} invoices, ${data.summary.claims_created} claims`
          : `Preview: ${data.summary.total_timesheets} timesheets, ${data.summary.blocked} blocked`
      );
      loadRuns();
    } catch (e: any) {
      toast.error(e.message ?? "Run failed");
    } finally {
      setRunning(false);
    }
  };

  const sendDunning = async () => {
    setRunning(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("billing-dunning", { body: {} });
      if (error) throw error;
      toast.success(`Sent ${data.sent_count} reminder(s)`);
    } catch (e: any) {
      toast.error(e.message ?? "Dunning failed");
    } finally { setRunning(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Auto Billing</h1>
            <p className="text-muted-foreground">One-click weekly billing from locked, EVV-reconciled timesheets</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run weekly billing</CardTitle>
          <CardDescription>
            Validates each timesheet (locked & signed, EVV reconciled, active authorization, current credentials, valid rate),
            then generates invoices, 837P claims, and CSV/PDF exports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div><Label>Period start</Label><Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} /></div>
            <div><Label>Period end</Label><Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} /></div>
            <div className="flex items-end gap-2">
              <Switch checked={strict} onCheckedChange={setStrict} id="strict" />
              <Label htmlFor="strict" className="cursor-pointer">Strict (block on any issue)</Label>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" className="flex-1" onClick={() => runPreview("preview")} disabled={running}>
                <RefreshCw className={`h-4 w-4 mr-1 ${running ? "animate-spin" : ""}`} /> Preview
              </Button>
              <Button className="flex-1" onClick={() => runPreview("commit")} disabled={running}>
                <Send className="h-4 w-4 mr-1" /> Run billing
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {preview.summary.blocked > 0
                ? <AlertTriangle className="h-5 w-5 text-warning" />
                : <CheckCircle2 className="h-5 w-5 text-success" />}
              Run summary
            </CardTitle>
            <CardDescription>
              {preview.summary.total_timesheets} timesheets •
              {" "}{preview.summary.generated} generated •
              {" "}{preview.summary.blocked} blocked •
              {" "}${Number(preview.summary.total_charge).toFixed(2)} total charge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timesheet</TableHead><TableHead>Hours</TableHead>
                  <TableHead>Units</TableHead><TableHead>Charge</TableHead>
                  <TableHead>Status</TableHead><TableHead>Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(preview.items ?? []).map((it: any) => (
                  <TableRow key={it.timesheet_id}>
                    <TableCell className="font-mono text-xs">{(it.timesheet_id || "").slice(0, 8)}</TableCell>
                    <TableCell>{Number(it.hours).toFixed(2)}</TableCell>
                    <TableCell>{Number(it.units).toFixed(2)}</TableCell>
                    <TableCell>${Number(it.charge).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={it.status === "blocked" ? "destructive" : "secondary"}>
                        {it.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{it.reason || "—"}</TableCell>
                  </TableRow>
                ))}
                {(preview.items ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No timesheets in period</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Past-due follow-up</CardTitle>
            <CardDescription>{unpaidCount} unpaid invoice(s). Sends throttled reminders to clients/payers.</CardDescription>
          </div>
          <Button onClick={sendDunning} disabled={running} variant="outline">
            <Bell className="h-4 w-4 mr-1" /> Send reminders
          </Button>
        </CardHeader>
      </Card>

      <PrebillReviewQueue />

      <PrebillOverrideLimits />

      <Card>
        <CardHeader><CardTitle>Recent runs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Period</TableHead><TableHead>Status</TableHead>
                <TableHead>Generated</TableHead><TableHead>Blocked</TableHead>
                <TableHead>Total</TableHead><TableHead>When</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {runs.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.period_start} → {r.period_end}</TableCell>
                  <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                  <TableCell>{r.generated_count}</TableCell>
                  <TableCell>{r.blocked_count}</TableCell>
                  <TableCell>${Number(r.total_charge).toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {runs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No runs yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}