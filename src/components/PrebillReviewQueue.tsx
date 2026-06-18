import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, AlertTriangle, RefreshCw, Check, X } from "lucide-react";

const REASON_CODES: { value: string; label: string }[] = [
  { value: "authorization_pending", label: "Authorization pending payer" },
  { value: "rate_documented_offline", label: "Rate documented offline" },
  { value: "credential_renewal_in_progress", label: "Credential renewal in progress" },
  { value: "evv_corrected_manually", label: "EVV corrected manually" },
  { value: "payer_exception_approved", label: "Payer exception approved" },
  { value: "one_time_admin_approval", label: "One-time admin approval" },
  { value: "other", label: "Other (see notes)" },
];

type Item = {
  id: string;
  timesheet_id: string | null;
  client_id: string | null;
  caregiver_id: string | null;
  status: string;
  reason: string | null;
  blockers: string[] | any;
  hours: number | null;
  charge: number | null;
  resolved: boolean;
  resolution: string | null;
  override_reason: string | null;
  override_notes: string | null;
  override_at: string | null;
  created_at: string;
};

export function PrebillReviewQueue() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Item | null>(null);
  const [mode, setMode] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("billing_run_items")
      .select("*")
      .eq("status", "blocked")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(100);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setItems(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDialog = (item: Item, m: "approve" | "reject") => {
    setActive(item); setMode(m);
    setReason(""); setNotes("");
  };

  const submit = async () => {
    if (!active) return;
    if (mode === "approve" && !reason) { toast.error("Reason code required"); return; }
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("prebill-override", {
        body: { action: mode, item_id: active.id, reason: reason || undefined, notes: notes || undefined },
      });
      if (error) throw error;
      toast.success(
        mode === "approve"
          ? `Approved — billing re-ran${data?.rerun?.summary ? `, ${data.rerun.summary.invoices_created ?? 0} invoice(s) generated` : ""}`
          : "Rejected and logged"
      );
      setActive(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
    } finally { setBusy(false); }
  };

  const rerun = async (item: Item) => {
    setBusy(true);
    try {
      const { error } = await (supabase as any).functions.invoke("prebill-override", {
        body: { action: "rerun", item_id: item.id, reason: "one_time_admin_approval", notes: "Re-evaluated after data fix" },
      });
      if (error) throw error;
      toast.success("Re-queued for validation");
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Pre-Bill Review Queue</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
        <CardDescription>
          Approve with reason codes to override pre-bill validation failures, or reject to keep blocked. Approving auto re-runs billing and restores eligibility for signing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            No blocked items in queue.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timesheet</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Charge</TableHead>
                <TableHead>Blockers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(it => {
                const blockers = Array.isArray(it.blockers) ? it.blockers : [];
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono text-xs">{it.timesheet_id?.slice(0, 8)}…</TableCell>
                    <TableCell>{it.hours ?? 0}</TableCell>
                    <TableCell>${(it.charge ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {blockers.length === 0 && it.reason && (
                          <Badge variant="outline" className="text-xs">{it.reason}</Badge>
                        )}
                        {blockers.map((b: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" /> {b}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => rerun(it)} disabled={busy}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Re-run
                      </Button>
                      <Button size="sm" onClick={() => openDialog(it, "approve")}>
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => openDialog(it, "reject")}>
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "approve" ? "Approve override" : "Reject item"}</DialogTitle>
            <DialogDescription>
              {mode === "approve"
                ? "Provide a reason code and notes. Billing will re-run for this timesheet and signing will be re-enabled."
                : "Add notes to keep this item blocked. The audit log will record your action."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {mode === "approve" && (
              <div>
                <Label>Reason code</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason code" /></SelectTrigger>
                  <SelectContent>
                    {REASON_CODES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Context, payer reference, supporting documentation…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={submit} disabled={busy} variant={mode === "reject" ? "destructive" : "default"}>
              {busy ? "Saving…" : mode === "approve" ? "Approve & re-run" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}