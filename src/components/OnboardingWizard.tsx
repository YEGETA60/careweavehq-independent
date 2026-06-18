import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, ChevronRight, X, Rocket, Building2,
  CreditCard, UserPlus, Users, CalendarPlus,
} from "lucide-react";
import { toast } from "sonner";

type StepKey =
  | "step_agency_info"
  | "step_payer"
  | "step_first_client"
  | "step_first_caregiver"
  | "step_first_shift";

interface ProgressRow {
  id?: string;
  company_id: string;
  step_agency_info: boolean;
  step_payer: boolean;
  step_first_client: boolean;
  step_first_caregiver: boolean;
  step_first_shift: boolean;
  dismissed: boolean;
  completed_at: string | null;
}

const STEPS: { key: StepKey; label: string; cta: string; section: string; icon: any; helper: string }[] = [
  { key: "step_agency_info", label: "Agency basic info", cta: "Open Company Profile", section: "company", icon: Building2, helper: "Name, tax ID, address, contact." },
  { key: "step_payer", label: "Add your first payer", cta: "Open Payers", section: "payers", icon: CreditCard, helper: "Medicaid, MCO, VA, or private-pay payer + service codes." },
  { key: "step_first_client", label: "Add your first client", cta: "Open Client Intake", section: "intake", icon: UserPlus, helper: "Run the digital intake or quick-add." },
  { key: "step_first_caregiver", label: "Invite your first caregiver", cta: "Open Caregivers", section: "caregivers", icon: Users, helper: "Send a mobile app invite — they'll clock in via GPS." },
  { key: "step_first_shift", label: "Schedule your first shift", cta: "Open Scheduler", section: "scheduling", icon: CalendarPlus, helper: "Pair a client with a caregiver for a real visit." },
];

export function OnboardingWizard({ onNavigate }: { onNavigate: (section: string) => void }) {
  const { user } = useAuth();
  const { companyId, loading: subLoading } = useSubscription();
  const [row, setRow] = useState<ProgressRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const ensureAndDetect = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);

    // Fetch existing progress row
    const { data: existing } = await (supabase as any)
      .from("onboarding_progress").select("*").eq("company_id", companyId).maybeSingle();

    let current: ProgressRow = existing ?? {
      company_id: companyId,
      step_agency_info: false, step_payer: false, step_first_client: false,
      step_first_caregiver: false, step_first_shift: false,
      dismissed: false, completed_at: null,
    };

    // Auto-detect completion from real data
    const [agency, payers, clients, caregivers, visits] = await Promise.all([
      // tax_id is restricted at column level; fetch via the secure RPC.
      Promise.all([
        (supabase as any).from("companies").select("name,address_line1").eq("id", companyId).maybeSingle(),
        (supabase as any).rpc("get_company_billing_identity", { _company_id: companyId }),
      ]).then(([base, ident]: any) => {
        const tax = Array.isArray(ident?.data) ? ident.data[0]?.tax_id : null;
        return { data: { ...(base?.data ?? {}), tax_id: tax } };
      }),
      (supabase as any).from("payers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      (supabase as any).from("clients").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      (supabase as any).from("caregivers").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      (supabase as any).from("visits").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    ]);

    const detected: Partial<ProgressRow> = {
      step_agency_info: !!(agency?.data?.name && agency?.data?.tax_id && agency?.data?.address_line1),
      step_payer: (payers?.count ?? 0) > 0,
      step_first_client: (clients?.count ?? 0) > 0,
      step_first_caregiver: (caregivers?.count ?? 0) > 0,
      step_first_shift: (visits?.count ?? 0) > 0,
    };

    // Merge: a step stays done once detected
    const merged: ProgressRow = {
      ...current,
      step_agency_info: current.step_agency_info || !!detected.step_agency_info,
      step_payer: current.step_payer || !!detected.step_payer,
      step_first_client: current.step_first_client || !!detected.step_first_client,
      step_first_caregiver: current.step_first_caregiver || !!detected.step_first_caregiver,
      step_first_shift: current.step_first_shift || !!detected.step_first_shift,
    };

    const allDone = STEPS.every((s) => merged[s.key]);
    if (allDone && !merged.completed_at) merged.completed_at = new Date().toISOString();

    // Persist if changed or first time
    const needsWrite =
      !existing ||
      STEPS.some((s) => existing[s.key] !== merged[s.key]) ||
      existing.completed_at !== merged.completed_at;
    if (needsWrite) {
      const payload = {
        company_id: companyId,
        step_agency_info: merged.step_agency_info,
        step_payer: merged.step_payer,
        step_first_client: merged.step_first_client,
        step_first_caregiver: merged.step_first_caregiver,
        step_first_shift: merged.step_first_shift,
        completed_at: merged.completed_at,
      };
      const { data: upserted } = await (supabase as any)
        .from("onboarding_progress")
        .upsert(payload, { onConflict: "company_id" })
        .select().maybeSingle();
      if (upserted) Object.assign(merged, upserted);
    }

    setRow(merged);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { if (!subLoading) ensureAndDetect(); }, [subLoading, ensureAndDetect]);

  const dismiss = async () => {
    if (!row || !companyId) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from("onboarding_progress").update({ dismissed: true }).eq("company_id", companyId);
    setBusy(false);
    if (error) return toast.error(error.message);
    setRow({ ...row, dismissed: true });
  };

  const reopen = async () => {
    if (!row || !companyId) return;
    await (supabase as any).from("onboarding_progress")
      .update({ dismissed: false }).eq("company_id", companyId);
    setRow({ ...row, dismissed: false });
  };

  if (loading || !row || !user) return null;

  const completedCount = STEPS.filter((s) => row[s.key]).length;
  const pct = Math.round((completedCount / STEPS.length) * 100);
  const allDone = completedCount === STEPS.length;

  // Compact "resume" pill once dismissed and not fully done
  if (row.dismissed && !allDone) {
    return (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={reopen} className="gap-2">
          <Rocket className="h-3.5 w-3.5 text-primary" />
          Resume setup ({completedCount}/{STEPS.length})
        </Button>
      </div>
    );
  }

  if (allDone && row.dismissed) return null;

  return (
    <Card className="border-primary/40 shadow-md bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg sm:text-xl font-semibold leading-tight">
                {allDone ? "You're live!" : "Get your agency live in 5 quick steps"}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {allDone
                  ? "Setup complete — your agency is ready to schedule, verify, and bill."
                  : "Most agencies finish this in under 10 minutes. We'll auto-check each step as you complete it."}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={dismiss} disabled={busy} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{completedCount} of {STEPS.length} complete</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <ol className="space-y-2">
          {STEPS.map((s, i) => {
            const done = row[s.key];
            const isNext = !done && STEPS.slice(0, i).every((p) => row[p.key]);
            const Icon = s.icon;
            return (
              <li
                key={s.key}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  done ? "bg-muted/30 border-border" : isNext ? "border-primary/50 bg-primary/5" : "border-border"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <p className={`font-medium text-sm ${done ? "line-through text-muted-foreground" : ""}`}>
                      {i + 1}. {s.label}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.helper}</p>
                </div>
                {!done && (
                  <Button
                    size="sm"
                    variant={isNext ? "default" : "outline"}
                    onClick={() => onNavigate(s.section)}
                    className="shrink-0"
                  >
                    {s.cta} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </li>
            );
          })}
        </ol>

        {allDone && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={dismiss}>Hide this card</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OnboardingWizard;