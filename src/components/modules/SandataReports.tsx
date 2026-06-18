import { useMemo, useState } from "react";
import { CompanyBrandingHeader } from "@/components/CompanyBrandingHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, Upload, Printer, ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw } from "lucide-react";
import { useHomeCareContext, Visit } from "@/contexts/HomeCareCenterContext";
import { printPage } from "@/lib/print-utils";
import { toast } from "sonner";

/**
 * Sandata EVV report row (subset of standard Sandata visit export columns).
 * Headers we accept (case-insensitive, flexible aliases):
 *  - ClientID / Client Id / Member ID
 *  - ClientName / Client Name
 *  - EmployeeID / CaregiverID
 *  - EmployeeName / Caregiver Name
 *  - VisitDate / Service Date
 *  - ScheduleStart / Scheduled Start
 *  - ScheduleEnd / Scheduled End
 *  - ActualStart / Visit Start / Call In
 *  - ActualEnd / Visit End / Call Out
 *  - VisitStatus / Status
 */
interface SandataRow {
  clientId?: string;
  clientName?: string;
  caregiverId?: string;
  caregiverName?: string;
  date?: string;
  scheduleStart?: string;
  scheduleEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  status?: string;
  raw: Record<string, string>;
}

type MatchStatus = "matched" | "time-mismatch" | "missing-in-system" | "missing-in-sandata";

interface ReconcileRow {
  status: MatchStatus;
  sandata?: SandataRow;
  visit?: Visit;
  notes: string[];
}

const ALIASES: Record<keyof Omit<SandataRow, "raw">, string[]> = {
  clientId: ["clientid", "client id", "memberid", "member id", "recipientid"],
  clientName: ["clientname", "client name", "membername", "member name"],
  caregiverId: ["employeeid", "employee id", "caregiverid", "caregiver id", "workerid"],
  caregiverName: ["employeename", "employee name", "caregivername", "caregiver name"],
  date: ["visitdate", "service date", "servicedate", "date"],
  scheduleStart: ["schedulestart", "scheduled start", "scheduledstart", "schedstart"],
  scheduleEnd: ["scheduleend", "scheduled end", "scheduledend", "schedend"],
  actualStart: ["actualstart", "visit start", "visitstart", "callin", "call in", "clockin", "clock in"],
  actualEnd: ["actualend", "visit end", "visitend", "callout", "call out", "clockout", "clock out"],
  status: ["visitstatus", "status"],
};

function parseCsv(text: string): SandataRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (lines.length < 2) return [];
  const splitLine = (l: string) => {
    const out: string[] = [];
    let cur = ""; let inQ = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const headers = splitLine(lines[0]).map(h => h.toLowerCase());
  const findIdx = (aliases: string[]) => headers.findIndex(h => aliases.includes(h));
  const idxMap: Record<keyof Omit<SandataRow, "raw">, number> = {
    clientId: findIdx(ALIASES.clientId),
    clientName: findIdx(ALIASES.clientName),
    caregiverId: findIdx(ALIASES.caregiverId),
    caregiverName: findIdx(ALIASES.caregiverName),
    date: findIdx(ALIASES.date),
    scheduleStart: findIdx(ALIASES.scheduleStart),
    scheduleEnd: findIdx(ALIASES.scheduleEnd),
    actualStart: findIdx(ALIASES.actualStart),
    actualEnd: findIdx(ALIASES.actualEnd),
    status: findIdx(ALIASES.status),
  };

  const normTime = (v?: string) => {
    if (!v) return undefined;
    const t = v.trim();
    // accept "HH:MM", "HH:MM:SS", or ISO "...THH:MM"
    const isoMatch = t.match(/T(\d{2}:\d{2})/);
    if (isoMatch) return isoMatch[1];
    const hm = t.match(/^(\d{1,2}):(\d{2})/);
    if (hm) return `${hm[1].padStart(2, "0")}:${hm[2]}`;
    return t;
  };
  const normDate = (v?: string) => {
    if (!v) return undefined;
    const t = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
    return t;
  };

  return lines.slice(1).map(line => {
    const cols = splitLine(line);
    const get = (k: keyof Omit<SandataRow, "raw">) => idxMap[k] >= 0 ? cols[idxMap[k]] : undefined;
    const raw: Record<string, string> = {};
    headers.forEach((h, i) => { raw[h] = cols[i] ?? ""; });
    return {
      clientId: get("clientId"),
      clientName: get("clientName"),
      caregiverId: get("caregiverId"),
      caregiverName: get("caregiverName"),
      date: normDate(get("date")),
      scheduleStart: normTime(get("scheduleStart")),
      scheduleEnd: normTime(get("scheduleEnd")),
      actualStart: normTime(get("actualStart")),
      actualEnd: normTime(get("actualEnd")),
      status: get("status"),
      raw,
    };
  });
}

function timeDiffMin(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const toMin = (t: string) => {
    const m = t.match(/^(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const ma = toMin(a); const mb = toMin(b);
  if (ma === null || mb === null) return null;
  return Math.abs(ma - mb);
}

export function SandataReports() {
  const { visits, clients, caregivers, updateVisit } = useHomeCareContext();
  const [rows, setRows] = useState<SandataRow[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (!parsed.length) {
      toast.error("No rows parsed", { description: "Check that the file is a Sandata CSV export." });
      return;
    }
    setRows(parsed);
    setFileName(file.name);
    toast.success(`Imported ${parsed.length} Sandata records`);
  };

  const reconciled: ReconcileRow[] = useMemo(() => {
    const result: ReconcileRow[] = [];
    const usedVisitIds = new Set<string>();

    const findClient = (r: SandataRow) => {
      if (r.clientId) {
        const c = clients.find(c => c.id === r.clientId);
        if (c) return c;
      }
      if (r.clientName) {
        return clients.find(c => c.name.toLowerCase() === r.clientName!.toLowerCase());
      }
      return undefined;
    };
    const findCaregiver = (r: SandataRow) => {
      if (r.caregiverId) {
        const c = caregivers.find(c => c.id === r.caregiverId);
        if (c) return c;
      }
      if (r.caregiverName) {
        return caregivers.find(c => c.name.toLowerCase() === r.caregiverName!.toLowerCase());
      }
      return undefined;
    };

    rows.forEach(r => {
      const client = findClient(r);
      const caregiver = findCaregiver(r);
      const candidate = visits.find(v =>
        !usedVisitIds.has(v.id) &&
        v.date === r.date &&
        (!client || v.clientId === client.id) &&
        (!caregiver || v.caregiverId === caregiver.id)
      );
      const notes: string[] = [];
      if (!client) notes.push("Client not found in system");
      if (!caregiver) notes.push("Caregiver not found in system");
      if (!candidate) {
        result.push({ status: "missing-in-system", sandata: r, notes });
        return;
      }
      usedVisitIds.add(candidate.id);

      const startDiff = timeDiffMin(candidate.verifiedStartTime || candidate.startTime, r.actualStart);
      const endDiff = timeDiffMin(candidate.verifiedEndTime || candidate.endTime, r.actualEnd);
      if (startDiff !== null && startDiff > 5) notes.push(`Start differs by ${startDiff} min`);
      if (endDiff !== null && endDiff > 5) notes.push(`End differs by ${endDiff} min`);
      result.push({
        status: notes.length ? "time-mismatch" : "matched",
        sandata: r,
        visit: candidate,
        notes,
      });
    });

    visits.forEach(v => {
      if (!usedVisitIds.has(v.id) && rows.length > 0) {
        result.push({ status: "missing-in-sandata", visit: v, notes: ["No matching Sandata record"] });
      }
    });

    return result;
  }, [rows, visits, clients, caregivers]);

  const stats = useMemo(() => ({
    matched: reconciled.filter(r => r.status === "matched").length,
    mismatch: reconciled.filter(r => r.status === "time-mismatch").length,
    missingSystem: reconciled.filter(r => r.status === "missing-in-system").length,
    missingSandata: reconciled.filter(r => r.status === "missing-in-sandata").length,
  }), [reconciled]);

  const applySandataTimes = (row: ReconcileRow) => {
    if (!row.visit || !row.sandata) return;
    updateVisit(row.visit.id, {
      verifiedStartTime: row.sandata.actualStart || row.visit.verifiedStartTime,
      verifiedEndTime: row.sandata.actualEnd || row.visit.verifiedEndTime,
      verificationStatus: "Verified",
      verificationIssues: [...(row.visit.verificationIssues ?? []), "Reconciled with Sandata report"],
      status: "Completed",
    });
    toast.success("Visit updated from Sandata");
  };

  const statusBadge = (s: MatchStatus) => {
    if (s === "matched") return <Badge className="bg-success/10 text-success border-success/20" variant="secondary"><ShieldCheck className="h-3 w-3 mr-1" />Matched</Badge>;
    if (s === "time-mismatch") return <Badge className="bg-warning/10 text-warning border-warning/20" variant="secondary"><ShieldAlert className="h-3 w-3 mr-1" />Time mismatch</Badge>;
    if (s === "missing-in-system") return <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Missing in system</Badge>;
    return <Badge className="bg-muted text-muted-foreground" variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Missing in Sandata</Badge>;
  };

  return (
    <div className="space-y-6">
      <CompanyBrandingHeader />
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
            <FileSpreadsheet className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sandata EVV Reports</h1>
            <p className="text-muted-foreground">Import Sandata exports and reconcile against scheduled visits</p>
          </div>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline" onClick={printPage} disabled={!rows.length}>
            <Printer className="h-4 w-4 mr-2" />Print Reconciliation
          </Button>
        </div>
      </div>

      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Import Sandata Report</CardTitle>
          <CardDescription>Upload a CSV exported from the Sandata Aggregator. Headers are auto-detected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="sandata-file">CSV file</Label>
            <Input
              id="sandata-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
          {fileName && <p className="text-sm text-muted-foreground">Loaded: <span className="font-medium text-foreground">{fileName}</span></p>}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Matched</p><p className="text-2xl font-bold text-success">{stats.matched}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Time mismatches</p><p className="text-2xl font-bold text-warning">{stats.mismatch}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Missing in system</p><p className="text-2xl font-bold text-destructive">{stats.missingSystem}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Missing in Sandata</p><p className="text-2xl font-bold text-foreground">{stats.missingSandata}</p></CardContent></Card>
        </div>
      )}

      {reconciled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation</CardTitle>
            <CardDescription>Compare Sandata times to scheduled visits and apply updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Caregiver</TableHead>
                    <TableHead>System times</TableHead>
                    <TableHead>Sandata times</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="no-print">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciled.map((row, idx) => {
                    const clientName = row.visit
                      ? clients.find(c => c.id === row.visit!.clientId)?.name
                      : row.sandata?.clientName || row.sandata?.clientId;
                    const caregiverName = row.visit
                      ? caregivers.find(c => c.id === row.visit!.caregiverId)?.name
                      : row.sandata?.caregiverName || row.sandata?.caregiverId;
                    return (
                      <TableRow key={idx}>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell>{row.visit?.date || row.sandata?.date || "—"}</TableCell>
                        <TableCell>{clientName || "—"}</TableCell>
                        <TableCell>{caregiverName || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {row.visit
                            ? `${row.visit.verifiedStartTime || row.visit.startTime}–${row.visit.verifiedEndTime || row.visit.endTime}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.sandata
                            ? `${row.sandata.actualStart || "?"}–${row.sandata.actualEnd || "?"}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {row.notes.length ? row.notes.join("; ") : "OK"}
                        </TableCell>
                        <TableCell className="no-print">
                          {row.status === "time-mismatch" && (
                            <Button size="sm" variant="outline" onClick={() => applySandataTimes(row)}>
                              <RefreshCw className="h-3 w-3 mr-1" />Apply Sandata
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}