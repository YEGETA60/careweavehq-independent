
-- 1. Add trial_duration_days to subscription_tiers
ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS trial_duration_days integer;

-- 2. Update company_is_read_only to treat tiers with a trial_duration_days
--    as expired when current_period_start + duration has passed.
CREATE OR REPLACE FUNCTION public.company_is_read_only(_company uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_subscriptions cs
    LEFT JOIN public.subscription_tiers t ON t.id = cs.tier_id
    WHERE cs.company_id = _company
      AND (
        -- Canceled / unpaid past period end
        (cs.status IN ('canceled','unpaid','incomplete_expired')
         AND (cs.current_period_end IS NULL OR cs.current_period_end < now()))
        OR
        -- Legacy: trialing without a payment method on file
        (cs.status = 'trialing' AND cs.external_subscription_id IS NULL
         AND t.trial_duration_days IS NULL)
        OR
        -- Time-limited free/trial tier whose duration has elapsed
        (t.trial_duration_days IS NOT NULL
         AND cs.external_subscription_id IS NULL
         AND COALESCE(cs.current_period_start, cs.created_at)
             + (t.trial_duration_days || ' days')::interval < now())
      )
  );
$function$;
