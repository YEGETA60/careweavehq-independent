import { AlertTriangle, Info, Shield, Sparkles, HeartPulse, DollarSign } from "lucide-react";
import { INLINE_DISCLAIMERS } from "@/lib/legal-content";
import { cn } from "@/lib/utils";

type Variant = keyof typeof INLINE_DISCLAIMERS | "custom";

const ICONS: Record<string, typeof Info> = {
  clinicalAi: HeartPulse,
  schedulingAi: Sparkles,
  financialEstimate: DollarSign,
  evvCompliance: Shield,
  familyPortal: HeartPulse,
  marketingNotConsent: Info,
  betaFeature: AlertTriangle,
  noPHIInSupport: Shield,
  custom: Info,
};

interface Props {
  variant: Variant;
  message?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Reusable inline legal/compliance disclaimer banner. Use throughout the app
 * wherever a feature could be misread as medical, legal, financial advice or
 * a guarantee of payment.
 */
export function LegalDisclaimer({ variant, message, className, compact }: Props) {
  const text = variant === "custom" ? (message ?? "") : INLINE_DISCLAIMERS[variant];
  const Icon = ICONS[variant] ?? Info;
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200",
        compact ? "px-2 py-1.5 text-[11px]" : "px-3 py-2 text-xs",
        className,
      )}
    >
      <Icon className={cn("shrink-0 mt-0.5", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
      <span className="leading-snug">{text}</span>
    </div>
  );
}