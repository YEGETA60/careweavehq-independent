import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { FileText, AlertTriangle } from "lucide-react";

interface Note {
  id: string; visit_id: string; subjective: string | null; objective: string | null;
  assessment: string | null; plan: string | null; incident: boolean; incident_details: string | null;
  author_id: string | null; created_at: string;
}

export function VisitNotes() {
  const { visits, clients, caregivers } = useHomeCareContext();
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ visit_id: "", subjective: "", objective: "", assessment: "", plan: "", incident: false, incident_details: "" });

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("visit_notes").select("*").order("created_at", { ascending: false });
    if (data) setNotes(data as Note[]);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const save = async () => {
    if (!form.visit_id) return toast.error("Pick a visit");
    const { error } = await supabase.from("visit_notes").insert({
      visit_id: form.visit_id, subjective: form.subjective || null, objective: form.objective || null,
      assessment: form.assessment || null, plan: form.plan || null,
      incident: form.incident, incident_details: form.incident ? form.incident_details : null,
      author_id: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    logAudit("create", "visit_note", form.visit_id, { incident: form.incident });
    toast.success("Note saved");
    setOpen(false);
    setForm({ visit_id: "", subjective: "", objective: "", assessment: "", plan: "", incident: false, incident_details: "" });
    refresh();
  };

  const visitLabel = (vid: string) => {
    const v = visits.find(x => x.id === vid);
    if (!v) return vid;
    const c = clients.find(x => x.id === v.clientId)?.name ?? "Client";
    const cg = caregivers.find(x => x.id === v.caregiverId)?.name ?? "Caregiver";
    return `${v.date} · ${c} / ${cg}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Visit Notes</CardTitle>
            <CardDescription>SOAP-style clinical notes attached to visits</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>New note</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>New visit note (SOAP)</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Visit</Label>
                  <Select value={form.visit_id} onValueChange={(v) => setForm({ ...form, visit_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select visit" /></SelectTrigger>
                    <SelectContent>
                      {visits.slice(0, 100).map(v => <SelectItem key={v.id} value={v.id}>{visitLabel(v.id)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Subjective</Label><Textarea value={form.subjective} onChange={(e) => setForm({ ...form, subjective: e.target.value })} placeholder="What client/family reported" /></div>
                <div><Label>Objective</Label><Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="What you observed/measured" /></div>
                <div><Label>Assessment</Label><Textarea value={form.assessment} onChange={(e) => setForm({ ...form, assessment: e.target.value })} /></div>
                <div><Label>Plan</Label><Textarea value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} /></div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.incident} onCheckedChange={(v) => setForm({ ...form, incident: !!v })} /> Report incident
                </label>
                {form.incident && (
                  <div><Label>Incident details</Label><Textarea value={form.incident_details} onChange={(e) => setForm({ ...form, incident_details: e.target.value })} /></div>
                )}
                <Button onClick={save} className="w-full">Save note</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Visit</TableHead><TableHead>Summary</TableHead><TableHead>Flags</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>
              {notes.map(n => (
                <TableRow key={n.id}>
                  <TableCell className="text-xs">{visitLabel(n.visit_id)}</TableCell>
                  <TableCell className="text-xs max-w-md truncate">{n.subjective || n.objective || n.assessment || "—"}</TableCell>
                  <TableCell>{n.incident && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />incident</Badge>}</TableCell>
                  <TableCell className="text-xs">{new Date(n.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {notes.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No notes yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}