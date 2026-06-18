import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

interface TrialBannerProps {
  onUpgrade?: () => void;
}

export function TrialBanner({ onUpgrade }: TrialBannerProps) {
  const { isTrialing, trialDaysLeft, tierName } = useSubscription();
  const { hasRole } = useAuth();
  if (hasRole("superadmin") || !isTrialing || trialDaysLeft === null) return null;

  return (
    <div className="bg-gradient-to-r from-primary/15 via-accent/15 to-primary/15 border-b border-primary/20 px-4 py-2 text-sm flex items-center justify-center gap-3 flex-wrap">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        {tierName ?? "Trial"} — {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left on your 45-day free trial. Switch plans anytime; one trial per company.
      </span>
      <Button size="sm" variant="default" onClick={onUpgrade}>Manage plan</Button>
    </div>
  );
}