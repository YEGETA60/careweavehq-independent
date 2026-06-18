import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { Plus, RefreshCw } from "lucide-react";

interface Series {
  id: string; client_id: string; caregiver_id: string;
  start_date: string; end_date: string; start_time: string; end_time: string;
  days_of_week: number[]; frequency: string; notes: string | null;
}

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function RecurringVisits() {
  const { clients, caregivers } = useHomeCareContext();
  const [series, setSeries] = useState<Series[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    client_id: "", caregiver_id: "", start_date: "", end_date: "",
    start_time: "09:00", end_time: "11:00", days_of_week: [] as number[],
    frequency: "weekly", notes: "",
  });

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("visit_series").select("*").order("start_date", { ascending: false });
    if (data) setSeries(data as Series[]);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const toggleDay = (d: number) => {
    setForm(f => ({ ...f, days_of_week: f.days_of_week.includes(d) ? f.days_of_week.filter(x => x !== d) : [...f.days_of_week, d].sort() }));
  };

  const generateVisits = async (s: Series) => {
    const start = new Date(s.start_date);
    const end = new Date(s.end_date);
    const visits: any[] = [];
    const weekStep = s.frequency === "biweekly" ? 14 : 7;
    let weekAnchor = new Date(start);
    weekAnchor.setDate(weekAnchor.getDate() - weekAnchor.getDay()); // Sunday of week
    while (weekAnchor <= end) {
      for (const dow of s.days_of_week) {
        const d = new Date(weekAnchor);
        d.setDate(d.getDate() + dow);
        if (d >= start && d <= end) {
          visits.push({
            client_id: s.client_id, caregiver_id: s.caregiver_id,
            date: d.toISOString().split("T")[0], start_time: s.start_time, end_time: s.end_time,
            status: "Scheduled", series_id: s.id,
          });
        }
      }
      weekAnchor.setDate(weekAnchor.getDate() + weekStep);
    }
    if (!visits.length) return toast.error("No matching dates");
    const { error } = await supabase.from("visits").insert(visits);
    if (error) return toast.error(error.message);
    logAudit("generate_recurring", "visit_series", s.id, { count: visits.length });
    toast.success(`Generated ${visits.length} visits`);
  };

  const save = async () => {
    if (!form.client_id || !form.caregiver_id || !form.start_date || !form.end_date || form.days_of_week.length === 0) {
      return toast.error("Fill all required fields and pick at least one day");
    }
    const { data, error } = await supabase.from("visit_series").insert(form).select().single();
    if (error) return toast.error(error.message);
    toast.success("Recurring schedule saved");
    setOpen(false);
    setForm({ client_id: "", caregiver_id: "", start_date: "", end_date: "", start_time: "09:00", end_time: "11:00", days_of_week: [], frequency: "weekly", notes: "" });
    refresh();
    if (data) generateVisits(data as Series);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recurring Visits</CardTitle>
            <CardDescription>Set up weekly or biweekly schedules; visits are auto-generated</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />New schedule</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New recurring schedule</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Client</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Caregiver</Label>
                  <Select value={form.caregiver_id} onValueChange={(v) => setForm({ ...form, caregiver_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select caregiver" /></SelectTrigger>
                    <SelectContent>{caregivers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                  <div><Label>End date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                  <div><Label>Start time</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                  <div><Label>End time</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Days of week</Label>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {DAYS.map((d, i) => (
                      <label key={i} className="flex items-center gap-1 text-sm">
                        <Checkbox checked={form.days_of_week.includes(i)} onCheckedChange={() => toggleDay(i)} /> {d}
                      </label>
                    ))}
                  </div>
                </div>
                <Button onClick={save} className="w-full">Save & generate visits</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Caregiver</TableHead><TableHead>Days</TableHead><TableHead>Time</TableHead><TableHead>Range</TableHead><TableHead>Frequency</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {series.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{clients.find(c => c.id === s.client_id)?.name ?? "—"}</TableCell>
                  <TableCell>{caregivers.find(c => c.id === s.caregiver_id)?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{s.days_of_week.map(d => DAYS[d]).join(", ")}</TableCell>
                  <TableCell className="text-xs">{s.start_time}–{s.end_time}</TableCell>
                  <TableCell className="text-xs">{s.start_date} → {s.end_date}</TableCell>
                  <TableCell><Badge variant="secondary">{s.frequency}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => generateVisits(s)}><RefreshCw className="h-3 w-3 mr-1" />Regenerate</Button>
                  </TableCell>
                </TableRow>
              ))}
              {series.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No recurring schedules yet</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}