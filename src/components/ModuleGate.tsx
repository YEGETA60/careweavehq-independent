import { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription } from "@/hooks/useSubscription";

interface ModuleGateProps {
  moduleId: string;
  onUpgrade?: () => void;
  children: ReactNode;
}

// Modules that are Enterprise-only and high-value. Used to tailor upsell copy.
const ENTERPRISE_MODULES: Record<string, { name: string; pitch: string }> = {
  clinical: { name: "eMAR & Clinical", pitch: "Track medications, vitals, and clinical notes with full audit trail." },
  "revenue-cycle": { name: "Revenue Cycle Management", pitch: "Denials, aging, 270/271 eligibility, and 276/277 claim status." },
  "claim-submissions": { name: "837P Claim Submissions", pitch: "Generate, submit, and reconcile 837P claims with your clearinghouse." },
  "state-aggregator": { name: "State Aggregator (HHAeXchange)", pitch: "Push EVV to state aggregators automatically." },
  "ai-scheduling": { name: "AI Shift Matching", pitch: "Recommend caregivers using skills, geography, and history." },
};

export function ModuleGate({ moduleId, onUpgrade, children }: ModuleGateProps) {
  const { isModuleUnlocked, tierName, loading } = useSubscription();
  if (loading || isModuleUnlocked(moduleId)) return <>{children}</>;

  const info = ENTERPRISE_MODULES[moduleId];

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-sm opacity-40" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-16 px-4">
        <Card className="max-w-md w-full border-primary/40 shadow-xl">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {info ? `${info.name} is Enterprise-only` : "This module is locked"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {info?.pitch ?? "Your current plan doesn't include this module."}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                You're on <span className="font-medium">{tierName ?? "Starter"}</span>. Upgrade to
                Enterprise ($299/mo) for full access plus 4-hour priority support and
                clearinghouse troubleshooting.
              </p>
            </div>
            <div className="space-y-2">
              <Button onClick={onUpgrade} className="w-full">
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Enterprise
              </Button>
              <Button asChild variant="ghost" size="sm" className="w-full text-xs">
                <Link to="/docs">Or read the docs first</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}