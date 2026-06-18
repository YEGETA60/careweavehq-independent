import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldAlert, Trash2, Plus } from "lucide-react";

const REASONS = [
  "authorization_pending",
  "rate_documented_offline",
  "credential_renewal_in_progress",
  "evv_corrected_manually",
  "payer_exception_approved",
  "one_time_admin_approval",
  "other",
];
const ROLES = ["billing", "supervisor", "manager", "operations_manager", "admin"];

export function PrebillOverrideLimits() {
  const [rows, setRows] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    reason: "one_time_admin_approval",
    role: "billing",
    max_single_amount: "",
    max_daily_count: "",
    max_weekly_amount: "",
    requires_second_approver: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: a }] = await Promise.all([
      (supabase as any).from("prebill_override_limits").select("*").order("reason"),
      (supabase as any).from("prebill_override_alerts").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setRows(r ?? []); setAlerts(a ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const payload: any = {
      reason: form.reason,
      role: form.role,
      max_single_amount: form.max_single_amount ? Number(form.max_single_amount) : null,
      max_daily_count: form.max_daily_count ? Number(form.max_daily_count) : null,
      max_weekly_amount: form.max_weekly_amount ? Number(form.max_weekly_amount) : null,
      requires_second_approver: form.requires_second_approver,
      active: true,
    };
    const { error } = await (supabase as any)
      .from("prebill_override_limits")
      .upsert(payload, { onConflict: "company_id,reason,role" });
    if (error) { toast.error(error.message); return; }
    toast.success("Limit saved");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("prebill_override_limits").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <CardTitle>Override limits</CardTitle>
          </div>
          <CardDescription>
            Configure per-reason × role caps. Approvals exceeding these are blocked at submission and notify the billing supervisor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
            <div>
              <Label>Reason</Label>
              <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Max single $</Label><Input type="number" value={form.max_single_amount} onChange={e => setForm(f => ({ ...f, max_single_amount: e.target.value }))} /></div>
            <div><Label>Max daily count</Label><Input type="number" value={form.max_daily_count} onChange={e => setForm(f => ({ ...f, max_daily_count: e.target.value }))} /></div>
            <div><Label>Max weekly $</Label><Input type="number" value={form.max_weekly_amount} onChange={e => setForm(f => ({ ...f, max_weekly_amount: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.requires_second_approver} onCheckedChange={v => setForm(f => ({ ...f, requires_second_approver: v }))} id="dual" />
              <Label htmlFor="dual" className="cursor-pointer text-xs">Dual approval</Label>
            </div>
          </div>
          <Button size="sm" onClick={save}><Plus className="h-3 w-3 mr-1" /> Save limit</Button>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead><TableHead>Role</TableHead>
                <TableHead>Single $</TableHead><TableHead>Daily #</TableHead>
                <TableHead>Weekly $</TableHead><TableHead>Dual</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.reason}</TableCell>
                  <TableCell className="text-xs">{r.role}</TableCell>
                  <TableCell>{r.max_single_amount ? `$${r.max_single_amount}` : "—"}</TableCell>
                  <TableCell>{r.max_daily_count ?? "—"}</TableCell>
                  <TableCell>{r.max_weekly_amount ? `$${r.max_weekly_amount}` : "—"}</TableCell>
                  <TableCell>{r.requires_second_approver ? "Yes" : "—"}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4 text-sm">{loading ? "Loading…" : "No limits configured"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent override alerts</CardTitle>
          <CardDescription>Notifications fired to the billing supervisor for high-value, unusual-frequency, or limit-exceeded approvals.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>When</TableHead><TableHead>Trigger</TableHead><TableHead>Reason</TableHead><TableHead>Amount</TableHead><TableHead>Notified</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={a.trigger === "limit_exceeded" ? "destructive" : "secondary"}>{a.trigger}</Badge></TableCell>
                  <TableCell className="text-xs">{a.reason ?? "—"}</TableCell>
                  <TableCell>{a.amount ? `$${Number(a.amount).toFixed(2)}` : "—"}</TableCell>
                  <TableCell>{a.notified_count}</TableCell>
                </TableRow>
              ))}
              {alerts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4 text-sm">No alerts yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}