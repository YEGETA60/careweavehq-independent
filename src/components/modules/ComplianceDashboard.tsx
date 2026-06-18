import { useEffect, useMemo, useState } from "react";
import { CompanyBrandingHeader } from "@/components/CompanyBrandingHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, AlertTriangle, GraduationCap, CheckCircle, Filter, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHomeCareContext } from "@/contexts/HomeCareCenterContext";
import { printPage } from "@/lib/print-utils";

interface CredRow { id: string; caregiver_id: string; type: string; number: string | null; expiry_date: string | null; company_id: string | null; }
interface AssignmentRow { id: string; user_id: string; course_id: string; due_date: string | null; company_id: string | null; }
interface CompletionRow { user_id: string; course_id: string; completed_at: string; expires_at: string | null; }
interface CourseRow { id: string; title: string; renewal_months: number | null; required_for_roles: string[]; }
interface CompanyRow { id: string; display_name: string | null; legal_name: string | null; }

type Status = "all" | "expired" | "expiring" | "valid";

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((new Date(date).getTime() - Date.now()) / 86400000);
}

function statusFor(days: number | null): "expired" | "expiring" | "valid" | "no-expiry" {
  if (days === null) return "no-expiry";
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "valid";
}

function StatusBadge({ s }: { s: ReturnType<typeof statusFor> }) {
  if (s === "expired") return <Badge variant="destructive">Expired</Badge>;
  if (s === "expiring") return <Badge className="bg-warning text-warning-foreground">Expiring</Badge>;
  if (s === "valid") return <Badge variant="secondary">Valid</Badge>;
  return <Badge variant="outline">No expiry</Badge>;
}

export function ComplianceDashboard() {
  const { caregivers } = useHomeCareContext();
  const [creds, setCreds] = useState<CredRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [completions, setCompletions] = useState<CompletionRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);

  // Filters
  const [caregiverId, setCaregiverId] = useState<string>("all");
  const [companyId, setCompanyId] = useState<string>("all");
  const [status, setStatus] = useState<Status>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [c, a, t, co, cm] = await Promise.all([
        supabase.from("credentials").select("id,caregiver_id,type,number,expiry_date,company_id"),
        supabase.from("training_assignments").select("id,user_id,course_id,due_date,company_id"),
        supabase.from("training_completions").select("user_id,course_id,completed_at,expires_at"),
        supabase.from("training_courses").select("id,title,renewal_months,required_for_roles").eq("active", true),
        supabase.from("companies").select("id,display_name,legal_name"),
      ]);
      setCreds((c.data ?? []) as CredRow[]);
      setAssignments((a.data ?? []) as AssignmentRow[]);
      setCompletions((t.data ?? []) as CompletionRow[]);
      setCourses((co.data ?? []) as CourseRow[]);
      setCompanies((cm.data ?? []) as CompanyRow[]);
    })();
  }, []);

  const cgById = useMemo(() => Object.fromEntries(caregivers.map(c => [c.id, c])), [caregivers]);
  const cgByUserId = useMemo(() => {
    const m: Record<string, typeof caregivers[number]> = {};
    for (const c of caregivers) if (c.user_id) m[c.user_id] = c;
    return m;
  }, [caregivers]);
  const courseById = useMemo(() => Object.fromEntries(courses.map(c => [c.id, c])), [courses]);
  const companyById = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c])), [companies]);

  const inDateRange = (d: string | null) => {
    if (!d) return !fromDate && !toDate;
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  };

  // Credential rows
  const credRows = useMemo(() => {
    return creds
      .map(c => {
        const cg = cgById[c.caregiver_id];
        const days = daysUntil(c.expiry_date);
        const s = statusFor(days);
        return { ...c, cg, days, s };
      })
      .filter(r => {
        if (caregiverId !== "all" && r.caregiver_id !== caregiverId) return false;
        if (companyId !== "all" && r.company_id !== companyId) return false;
        if (status !== "all" && r.s !== status) return false;
        if ((fromDate || toDate) && !inDateRange(r.expiry_date)) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!(r.cg?.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q) || (r.number ?? "").toLowerCase().includes(q))) return false;
        }
        return true;
      })
      .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity));
  }, [creds, cgById, caregiverId, companyId, status, fromDate, toDate, search]);

  // Latest completion per (user, course)
  const latestCompletion = useMemo(() => {
    const m = new Map<string, CompletionRow>();
    for (const c of completions) {
      const k = `${c.user_id}:${c.course_id}`;
      const prev = m.get(k);
      if (!prev || c.completed_at > prev.completed_at) m.set(k, c);
    }
    return m;
  }, [completions]);

  // Training rows: an entry per assignment OR per required course-caregiver pair from completions where overdue/expired
  const trainingRows = useMemo(() => {
    type Row = { key: string; user_id: string; course_id: string; courseTitle: string; cgName: string; cgId: string | null; company_id: string | null; due_date: string | null; expires_at: string | null; s: ReturnType<typeof statusFor>; days: number | null; reason: "overdue" | "expired" | "upcoming" | "valid" };
    const rows: Row[] = [];
    // Assignments → due date drives status
    for (const a of assignments) {
      const cg = cgByUserId[a.user_id];
      const completion = latestCompletion.get(`${a.user_id}:${a.course_id}`);
      if (completion && (!completion.expires_at || new Date(completion.expires_at) > new Date())) continue; // satisfied
      const days = daysUntil(a.due_date);
      const s = statusFor(days);
      rows.push({
        key: `a:${a.id}`,
        user_id: a.user_id,
        course_id: a.course_id,
        courseTitle: courseById[a.course_id]?.title ?? "Unknown course",
        cgName: cg?.name ?? "Unlinked user",
        cgId: cg?.id ?? null,
        company_id: a.company_id,
        due_date: a.due_date,
        expires_at: null,
        s,
        days,
        reason: s === "expired" ? "overdue" : s === "expiring" ? "upcoming" : "valid",
      });
    }
    // Expired completions (renewal lapsed)
    for (const c of completions) {
      if (!c.expires_at) continue;
      const days = daysUntil(c.expires_at);
      const s = statusFor(days);
      if (s === "valid") continue;
      const cg = cgByUserId[c.user_id];
      rows.push({
        key: `c:${c.user_id}:${c.course_id}:${c.completed_at}`,
        user_id: c.user_id,
        course_id: c.course_id,
        courseTitle: courseById[c.course_id]?.title ?? "Unknown course",
        cgName: cg?.name ?? "Unlinked user",
        cgId: cg?.id ?? null,
        company_id: null,
        due_date: null,
        expires_at: c.expires_at,
        s,
        days,
        reason: s === "expired" ? "expired" : "upcoming",
      });
    }
    return rows
      .filter(r => {
        if (caregiverId !== "all" && r.cgId !== caregiverId) return false;
        if (companyId !== "all" && r.company_id && r.company_id !== companyId) return false;
        if (status !== "all" && r.s !== status) return false;
        const refDate = r.due_date ?? r.expires_at;
        if ((fromDate || toDate) && !inDateRange(refDate)) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!(r.cgName.toLowerCase().includes(q) || r.courseTitle.toLowerCase().includes(q))) return false;
        }
        return true;
      })
      .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity));
  }, [assignments, completions, latestCompletion, courseById, cgByUserId, caregiverId, companyId, status, fromDate, toDate, search]);

  // Aggregate KPIs
  const kpis = useMemo(() => {
    const credExpired = credRows.filter(r => r.s === "expired").length;
    const credExpiring = credRows.filter(r => r.s === "expiring").length;
    const trnOverdue = trainingRows.filter(r => r.s === "expired").length;
    const trnUpcoming = trainingRows.filter(r => r.s === "expiring").length;
    const affectedCgs = new Set<string>();
    credRows.forEach(r => r.s !== "valid" && affectedCgs.add(r.caregiver_id));
    trainingRows.forEach(r => r.cgId && r.s !== "valid" && affectedCgs.add(r.cgId));
    return { credExpired, credExpiring, trnOverdue, trnUpcoming, affectedCgs: affectedCgs.size };
  }, [credRows, trainingRows]);

  const exportCsv = () => {
    const lines = ["section,caregiver,company,item,reference,date,status,days"];
    for (const r of credRows) {
      lines.push([
        "credential",
        JSON.stringify(r.cg?.name ?? ""),
        JSON.stringify(companyById[r.company_id ?? ""]?.display_name ?? companyById[r.company_id ?? ""]?.legal_name ?? ""),
        JSON.stringify(r.type),
        JSON.stringify(r.number ?? ""),
        r.expiry_date ?? "",
        r.s,
        r.days ?? "",
      ].join(","));
    }
    for (const r of trainingRows) {
      lines.push([
        "training",
        JSON.stringify(r.cgName),
        JSON.stringify(companyById[r.company_id ?? ""]?.display_name ?? companyById[r.company_id ?? ""]?.legal_name ?? ""),
        JSON.stringify(r.courseTitle),
        r.reason,
        (r.due_date ?? r.expires_at ?? ""),
        r.s,
        r.days ?? "",
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `compliance-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setCaregiverId("all"); setCompanyId("all"); setStatus("all"); setFromDate(""); setToDate(""); setSearch("");
  };

  return (
    <div className="space-y-6">
      <CompanyBrandingHeader />
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
            <ShieldAlert className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compliance Dashboard</h1>
            <p className="text-muted-foreground">Expiring credentials & overdue training across your organization</p>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={printPage}><Printer className="h-4 w-4 mr-2" />Print</Button>
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Expired credentials</div><div className="text-3xl font-bold text-destructive">{kpis.credExpired}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Expiring credentials</div><div className="text-3xl font-bold text-warning">{kpis.credExpiring}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Overdue training</div><div className="text-3xl font-bold text-destructive">{kpis.trnOverdue}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Upcoming training</div><div className="text-3xl font-bold text-warning">{kpis.trnUpcoming}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">Caregivers affected</div><div className="text-3xl font-bold">{kpis.affectedCgs}</div></CardContent></Card>
      </div>

      <Card className="no-print">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" />Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-xs">Caregiver</Label>
              <Select value={caregiverId} onValueChange={setCaregiverId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All caregivers</SelectItem>
                  {caregivers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Company</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All companies</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.display_name ?? c.legal_name ?? c.id.slice(0,8)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="expired">Expired / Overdue</SelectItem>
                  <SelectItem value="expiring">Expiring ≤ 30 days</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From date</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To date</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Search</Label>
              <Input placeholder="Name, course, license #" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filters</Button>
            <Button variant="outline" size="sm" onClick={() => { setStatus("expired"); setFromDate(""); setToDate(""); }}>Show expired only</Button>
            <Button variant="outline" size="sm" onClick={() => {
              const today = new Date(); const in30 = new Date(today.getTime() + 30 * 86400000);
              setStatus("expiring"); setFromDate(today.toISOString().slice(0,10)); setToDate(in30.toISOString().slice(0,10));
            }}>Next 30 days</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="credentials">
        <TabsList>
          <TabsTrigger value="credentials"><ShieldAlert className="h-4 w-4 mr-2" />Credentials ({credRows.length})</TabsTrigger>
          <TabsTrigger value="training"><GraduationCap className="h-4 w-4 mr-2" />Training ({trainingRows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caregiver</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {credRows.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8"><CheckCircle className="h-5 w-5 inline mr-2" />No matching credentials</TableCell></TableRow>
                  ) : credRows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.cg?.name ?? "—"}</TableCell>
                      <TableCell>{r.type}</TableCell>
                      <TableCell className="font-mono text-xs">{r.number ?? "—"}</TableCell>
                      <TableCell>{r.expiry_date ?? "—"}</TableCell>
                      <TableCell>
                        {r.days === null ? "—" : r.days < 0 ? <span className="text-destructive">{r.days}d</span> : r.days <= 30 ? <span className="text-warning">{r.days}d</span> : `${r.days}d`}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{companyById[r.company_id ?? ""]?.display_name ?? companyById[r.company_id ?? ""]?.legal_name ?? "—"}</TableCell>
                      <TableCell><StatusBadge s={r.s} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caregiver</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Due / Expires</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingRows.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8"><CheckCircle className="h-5 w-5 inline mr-2" />No outstanding training</TableCell></TableRow>
                  ) : trainingRows.map(r => (
                    <TableRow key={r.key}>
                      <TableCell className="font-medium">{r.cgName}</TableCell>
                      <TableCell>{r.courseTitle}</TableCell>
                      <TableCell className="capitalize text-xs">
                        {r.reason === "overdue" && <span className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Overdue</span>}
                        {r.reason === "expired" && <span className="text-destructive">Renewal expired</span>}
                        {r.reason === "upcoming" && <span className="text-warning">Upcoming</span>}
                        {r.reason === "valid" && <span>Valid</span>}
                      </TableCell>
                      <TableCell>{r.due_date ?? r.expires_at ?? "—"}</TableCell>
                      <TableCell>
                        {r.days === null ? "—" : r.days < 0 ? <span className="text-destructive">{r.days}d</span> : r.days <= 30 ? <span className="text-warning">{r.days}d</span> : `${r.days}d`}
                      </TableCell>
                      <TableCell><StatusBadge s={r.s} /></TableCell>
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