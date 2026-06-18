import { Lock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useSuperadminOverride } from "@/hooks/useSuperadminOverride";
import { toast } from "sonner";
import { useState } from "react";

interface Props { onUpgrade?: () => void }

export function ReadOnlyBanner({ onUpgrade }: Props) {
  const { isReadOnly, status, trialEndsAt, companyId } = useSubscription();
  const { overrideEnabled, setOverrideEnabled, isSuperadmin } = useSuperadminOverride();
  const [busy, setBusy] = useState(false);

  if (isSuperadmin) return null;
  if (!isReadOnly) return null;
  if (overrideEnabled) {
    return (
      <div data-allow-readonly className="bg-yellow-500/15 border-b border-yellow-500/30 px-4 py-2 text-sm flex items-center justify-center gap-3 flex-wrap sticky top-0 z-40">
        <span className="font-medium text-yellow-900 dark:text-yellow-200">
          Superadmin support override active — read-only restrictions bypassed.
        </span>
        <Button data-allow-readonly size="sm" variant="outline" onClick={() => setOverrideEnabled(false)}>
          Disable override
        </Button>
      </div>
    );
  }

  const openBillingPortal = async () => {
    if (!companyId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          companyId,
          environment: getStripeEnvironment(),
          returnUrl: window.location.origin,
        },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error("No portal URL returned");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message || "Unable to open billing portal");
    } finally {
      setBusy(false);
    }
  };

  const trialNoCard = status === "trialing";
  const message = trialNoCard
    ? "Your workspace is read-only — add a payment method to unlock writing during your free trial."
    : "Your 45-day trial has ended — workspace is read-only. Choose Standard ($99/mo), Professional ($199/mo), or Enterprise ($299/mo) to restore access.";
  return (
    <div
      data-allow-readonly
      className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-sm flex items-center justify-center gap-3 flex-wrap sticky top-0 z-40"
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
        <Lock className="h-4 w-4" />
        {message}
        {trialEndsAt && trialNoCard && (
          <> Trial ends {new Date(trialEndsAt).toLocaleDateString()}.</>
        )}
      </span>
      {onUpgrade && (
        <Button data-allow-readonly size="sm" variant="default" onClick={onUpgrade}>
          {trialNoCard ? "Add payment method" : "Choose a plan"}
        </Button>
      )}
      <Button data-allow-readonly size="sm" variant="outline" onClick={openBillingPortal} disabled={busy || !companyId}>
        <ExternalLink className="h-3.5 w-3.5 mr-1" />
        {busy ? "Opening…" : "Manage billing"}
      </Button>
      {isSuperadmin && (
        <Button data-allow-readonly size="sm" variant="ghost" onClick={() => setOverrideEnabled(true)}>
          Superadmin override
        </Button>
      )}
    </div>
  );
}