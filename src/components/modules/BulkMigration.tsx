import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Download, Upload, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type SheetKey = "caregivers" | "payers" | "clients" | "authorizations" | "recurring" | "careplans" | "balances";

const SHEET_HEADERS: Record<SheetKey, string[]> = {
  caregivers: ["ref","name","email","phone","skills","certifications","hourly_wage","status"],
  payers: ["ref","name","payer_type","payer_id_external","contact_phone","contact_email"],
  clients: ["ref","name","address","phone","emergency_contact","care_level","hourly_rate","status","care_plan","lat","lng"],
  authorizations: ["client_ref","payer_ref","auth_number","service_code","units_approved","unit_minutes","hourly_rate","start_date","end_date","status","notes"],
  recurring: ["client_ref","caregiver_ref","auth_number","start_date","end_date","days_of_week","start_time","end_time","frequency","notes"],
  careplans: ["client_ref","tasks"],
  balances: ["client_ref","amount","hours","due_date","status"],
};

const SHEET_LABEL: Record<SheetKey, string> = {
  caregivers: "Caregivers",
  payers: "Payers",
  clients: "Clients",
  authorizations: "Authorizations",
  recurring: "Recurring Schedules",
  careplans: "Care Plans",
  balances: "Opening Balances",
};

function parsePaste(text: string, headers: string[]): any[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  // skip header row if it matches
  const first = lines[0].split(/\t|,/).map((s) => s.trim().toLowerCase());
  const start = headers.every((h) => first.includes(h.toLowerCase())) ? 1 : 0;
  const usedHeaders = start === 1 ? first : headers;
  const rows: any[] = [];
  for (let i = start; i < lines.length; i++) {
    const cells = lines[i].split(/\t|,/).map((s) => s.trim());
    const obj: any = {};
    usedHeaders.forEach((h, idx) => { obj[h] = cells[idx] ?? ""; });
    rows.push(obj);
  }
  return rows;
}

export function BulkMigration() {
  const [pasted, setPasted] = useState<Record<SheetKey, string>>({
    caregivers: "", payers: "", clients: "", authorizations: "", recurring: "", careplans: "", balances: "",
  });
  const [tab, setTab] = useState<SheetKey>("clients");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const buildSheets = () => {
    const sheets: any = {};
    (Object.keys(pasted) as SheetKey[]).forEach((k) => {
      const rows = parsePaste(pasted[k], SHEET_HEADERS[k]);
      if (rows.length) sheets[k] = rows;
    });
    return sheets;
  };

  const counts = (() => {
    const out: Record<SheetKey, number> = { caregivers: 0, payers: 0, clients: 0, authorizations: 0, recurring: 0, careplans: 0, balances: 0 };
    (Object.keys(pasted) as SheetKey[]).forEach((k) => { out[k] = parsePaste(pasted[k], SHEET_HEADERS[k]).length; });
    return out;
  })();

  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);

  const run = async (mode: "validate" | "commit") => {
    const sheets = buildSheets();
    if (Object.keys(sheets).length === 0) { toast.error("Paste at least one sheet of rows"); return; }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-migrate", { body: { mode, sheets } });
      if (error) throw error;
      setResult(data);
      if (mode === "commit") toast.success(`Migration complete (run ${data.runId?.slice(0, 8) ?? "?"})`);
      else toast.success("Validation passed");
    } catch (e: any) {
      toast.error(e?.message ?? "Migration failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-lg">
          <Database className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bulk Data Migration</h1>
          <p className="text-muted-foreground">Import existing active clients, caregivers, authorizations, and schedules</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Step 1 — Download Template</CardTitle>
          <CardDescription>Excel workbook with one sheet per entity, dropdowns, and a worked example.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <a href="/CareWeave-Migration-Template.xlsx" download>
              <Download className="h-4 w-4 mr-2" /> CareWeave-Migration-Template.xlsx
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Step 2 — Paste Rows by Sheet</CardTitle>
          <CardDescription>Copy rows directly from Excel/Google Sheets and paste into each tab. Header row optional.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as SheetKey)}>
            <TabsList className="flex-wrap h-auto">
              {(Object.keys(SHEET_LABEL) as SheetKey[]).map((k) => (
                <TabsTrigger key={k} value={k} className="gap-2">
                  {SHEET_LABEL[k]}
                  {counts[k] > 0 && <Badge variant="secondary">{counts[k]}</Badge>}
                </TabsTrigger>
              ))}
            </TabsList>
            {(Object.keys(SHEET_LABEL) as SheetKey[]).map((k) => (
              <TabsContent key={k} value={k} className="space-y-2 pt-3">
                <Label className="text-xs text-muted-foreground">
                  Columns: <code className="text-foreground">{SHEET_HEADERS[k].join(", ")}</code>
                </Label>
                <Textarea
                  value={pasted[k]}
                  onChange={(e) => setPasted((p) => ({ ...p, [k]: e.target.value }))}
                  placeholder={`Paste ${SHEET_LABEL[k]} rows here (tab or comma separated)`}
                  rows={8}
                  className="font-mono text-xs"
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Play className="h-5 w-5" /> Step 3 — Validate & Commit</CardTitle>
          <CardDescription>{totalRows} row(s) ready across {Object.values(counts).filter((n) => n > 0).length} sheet(s).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" disabled={running || totalRows === 0} onClick={() => run("validate")}>
              Validate Only
            </Button>
            <Button disabled={running || totalRows === 0} onClick={() => run("commit")}>
              {running ? "Importing…" : "Commit Migration"}
            </Button>
          </div>
          {result && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">{result.mode === "commit" ? "Imported" : "Validated"}.</span>{" "}
                  Run ID: <code>{result.runId ?? "—"}</code>
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(result.summary ?? {}).map(([sheet, s]: any) => (
                  <div key={sheet} className="border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground uppercase">{sheet}</p>
                    <p className="text-sm">
                      <span className="text-success font-medium">{s.created}</span> created
                      {" · "}<span className="text-primary">{s.updated}</span> updated
                      {s.failed > 0 && <> {" · "}<span className="text-destructive">{s.failed}</span> failed</>}
                    </p>
                  </div>
                ))}
              </div>
              {Array.isArray(result.errors) && result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">{result.errors.length} row error(s):</p>
                    <ul className="list-disc pl-5 space-y-0.5 max-h-48 overflow-auto text-xs">
                      {result.errors.slice(0, 50).map((e: any, i: number) => (
                        <li key={i}><strong>{e.sheet}</strong> [{e.ref || "—"}]: {e.error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}