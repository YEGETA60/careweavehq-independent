import { CheckCircle2, Sparkles, Infinity as InfinityIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

const TRIAL_GROUPS: { title: string; items: string[] }[] = [
  {
    title: "Care & clinical",
    items: [
      "Client profiles, demographics & contacts",
      "Digital intake with canvas e-signatures",
      "Care plans per client (PDF parse + auto-build)",
      "Visit notes, SOAP & incident reports",
      "Clinical: eMAR, vitals, ADLs, assessments",
      "Family Portal with care updates",
    ],
  },
  {
    title: "Scheduling & EVV",
    items: [
      "Scheduling, recurring visits & live map",
      "GPS-verified EVV clock in/out (online & offline)",
      "Geofence enforcement & overtime forecast",
      "AI shift matching (skills, location, history)",
      "AI visit summaries & manual draft assistant",
      "Caregiver mobile app (Today, Schedule, Messages)",
    ],
  },
  {
    title: "Billing, RCM & payroll",
    items: [
      "Auto-billing run from GPS-verified hours",
      "Prebill review queue with override limits",
      "837P claims + 835 remittance posting",
      "Eligibility 270/271 & claim status 276/277",
      "Denials, aging & rate sheets",
      "Payroll on verified hours (paid-invoice lock)",
    ],
  },
  {
    title: "Compliance, comms & integrations",
    items: [
      "Caregiver credentials & expiration tracking",
      "HIPAA & compliance training (Learning Home)",
      "OIG/SAM exclusion scans",
      "PHI-redacted messaging & attachments",
      "Sandata / HHAeXchange state aggregator",
      "Reports & analytics, secure document storage",
    ],
  },
];

interface Props { onChoosePlan?: () => void }

export function TrialFeaturesCard({ onChoosePlan }: Props) {
  const { isTrialing, trialDaysLeft, isReadOnly, tierName } = useSubscription();
  if (!isTrialing && !isReadOnly) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-[hsl(36_45%_97%)] via-background to-[hsl(204_60%_97%)] overflow-hidden">
      <style>{`.font-display{font-family:'Playfair Display',ui-serif,Georgia,serif;letter-spacing:-0.015em}`}</style>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-display flex items-center gap-2 text-2xl md:text-3xl font-semibold">
              <Sparkles className="h-6 w-6 text-primary" />
              {isReadOnly ? "Trial ended — choose a plan to continue" : `You're on a 45-day free trial${tierName ? ` (${tierName})` : ""}`}
            </CardTitle>
            <CardDescription className="mt-1">
              {isReadOnly
                ? "Your workspace is read-only. Choose Standard ($99/mo, 5 clients), Professional ($199/mo, 25 clients), or Enterprise ($299/mo, 100 clients) to restore access. Each company gets one free trial."
                : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left — no card required. You can switch tiers at any time during the 45 days, but this is your company's only free trial.`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 rounded-full"><InfinityIcon className="h-3 w-3" />{tierName ?? "Trial"} · 45 days · one per company</Badge>
            {onChoosePlan && <Button size="sm" className="rounded-full" onClick={onChoosePlan}>Choose a plan</Button>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">What's included during your trial</p>
        <div className="grid gap-5 md:grid-cols-2">
          {TRIAL_GROUPS.map((g) => (
            <div key={g.title} className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-4">
              <div className="font-display text-lg font-semibold mb-2">{g.title}</div>
              <ul className="space-y-1.5 text-sm">
                {g.items.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-5">
          When your 45-day trial ends, your workspace switches to read-only until you pick Standard ($99/mo, 5 clients), Professional ($199/mo, 25 clients), or Enterprise ($299/mo, 100 clients). No charges happen automatically, and free trials are limited to one per company.
        </p>
      </CardContent>
    </Card>
  );
}