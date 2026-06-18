import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ShieldQuestion } from "lucide-react";

interface Client { id: string; name: string; }
interface Payer { id: string; name: string; }
interface Result {
  status: string; is_active: boolean | null; member_id?: string | null;
  plan_name?: string | null; copay_amount?: number | null;
  deductible_remaining?: number | null; oop_remaining?: number | null;
  provider?: string | null; coverage_start?: string | null; coverage_end?: string | null;
}

export function EligibilityCheckPanel({ clients, payers }: { clients: Client[]; payers: Payer[] }) {
  const [clientId, setClientId] = useState("");
  const [payerId, setPayerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const run = async () => {
    if (!clientId) return toast.error("Select a client");
    setBusy(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("check-eligibility-270", {
      body: { client_id: clientId, payer_id: payerId || undefined },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    setResult(data.eligibility as Result);
    toast.success("Eligibility check complete");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldQuestion className="h-5 w-5" /> Real-time Eligibility (270/271)
        </CardTitle>
        <CardDescription>
          Verify coverage before scheduling. Falls back to mock when no clearinghouse is configured.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder="Client" /></SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={payerId} onValueChange={setPayerId}>
            <SelectTrigger><SelectValue placeholder="Payer (optional)" /></SelectTrigger>
            <SelectContent>
              {payers.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={run} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Check eligibility
          </Button>
        </div>
        {result && (
          <div className="rounded-md border p-3 text-sm space-y-1">
            <div className="flex items-center gap-2">
              {result.is_active
                ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Active</Badge>
                : <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Inactive</Badge>}
              <span className="text-muted-foreground">via {result.provider}</span>
            </div>
            <div>Member ID: <span className="font-mono">{result.member_id ?? "—"}</span></div>
            <div>Plan: {result.plan_name ?? "—"}</div>
            <div>Coverage: {result.coverage_start ?? "—"} → {result.coverage_end ?? "—"}</div>
            <div>Copay: ${result.copay_amount ?? 0} · Deductible left: ${result.deductible_remaining ?? 0} · OOP left: ${result.oop_remaining ?? 0}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}