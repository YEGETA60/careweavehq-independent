import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { toast } from "sonner";
import { Plus, AlertTriangle } from "lucide-react";

interface Credential {
  id: string; caregiver_id: string; type: string; number: string | null;
  issuer: string | null; issued_date: string | null; expiry_date: string | null;
}

const COMMON = ["CNA","HHA","CPR","First Aid","TB Test","Background Check","Driver's License","I-9","W-4"];

export function Credentials() {
  const { caregivers } = useHomeCareContext();
  const [creds, setCreds] = useState<Credential[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ caregiver_id: "", type: "CPR", number: "", issuer: "", issued_date: "", expiry_date: "" });

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("credentials").select("*").order("expiry_date", { ascending: true });
    if (data) setCreds(data as Credential[]);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const save = async () => {
    if (!form.caregiver_id || !form.type) return toast.error("Caregiver and type required");
    const { error } = await supabase.from("credentials").insert({
      caregiver_id: form.caregiver_id, type: form.type, number: form.number || null,
      issuer: form.issuer || null,
      issued_date: form.issued_date || null, expiry_date: form.expiry_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Credential added");
    setOpen(false);
    setForm({ caregiver_id: "", type: "CPR", number: "", issuer: "", issued_date: "", expiry_date: "" });
    refresh();
  };

  const expiringSoon = creds.filter(c => {
    if (!c.expiry_date) return false;
    const d = new Date(c.expiry_date);
    const days = (d.getTime() - Date.now()) / 86400000;
    return days < 30;
  });

  return (
    <div className="space-y-6">
      {expiringSoon.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning"><AlertTriangle className="h-5 w-5" /> {expiringSoon.length} credential(s) expiring or expired</CardTitle>
          </CardHeader>
        </Card>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Caregiver Credentials</CardTitle>
            <CardDescription>Track licenses, certifications, and expiration dates</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Add credential</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New credential</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Caregiver</Label>
                  <Select value={form.caregiver_id} onValueChange={(v) => setForm({ ...form, caregiver_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select caregiver" /></SelectTrigger>
                    <SelectContent>{caregivers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COMMON.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Number</Label><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
                  <div><Label>Issuer</Label><Input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /></div>
                  <div><Label>Issued</Label><Input type="date" value={form.issued_date} onChange={(e) => setForm({ ...form, issued_date: e.target.value })} /></div>
                  <div><Label>Expires</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
                </div>
                <Button onClick={save} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Caregiver</TableHead><TableHead>Type</TableHead><TableHead>Number</TableHead><TableHead>Issuer</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {creds.map(c => {
                const cg = caregivers.find(x => x.id === c.caregiver_id);
                const days = c.expiry_date ? (new Date(c.expiry_date).getTime() - Date.now()) / 86400000 : Infinity;
                const status = !c.expiry_date ? "—" : days < 0 ? "expired" : days < 30 ? "expiring" : "valid";
                return (
                  <TableRow key={c.id}>
                    <TableCell>{cg?.name ?? "—"}</TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell className="font-mono text-xs">{c.number || "—"}</TableCell>
                    <TableCell>{c.issuer || "—"}</TableCell>
                    <TableCell>{c.expiry_date || "—"}</TableCell>
                    <TableCell>
                      {status === "valid" && <Badge variant="secondary">valid</Badge>}
                      {status === "expiring" && <Badge className="bg-warning text-warning-foreground">expiring</Badge>}
                      {status === "expired" && <Badge variant="destructive">expired</Badge>}
                      {status === "—" && <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {creds.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No credentials tracked yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}