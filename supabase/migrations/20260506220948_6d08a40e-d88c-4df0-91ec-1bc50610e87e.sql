CREATE OR REPLACE FUNCTION public.company_is_read_only(_company uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.company_subscriptions
    WHERE company_id = _company
      AND (
        -- Canceled / unpaid past period end
        (status IN ('canceled','unpaid','incomplete_expired')
         AND (current_period_end IS NULL OR current_period_end < now()))
        OR
        -- Trial expired without a paid subscription attached
        (status = 'trialing'
         AND trial_ends_at IS NOT NULL
         AND trial_ends_at < now()
         AND external_subscription_id IS NULL)
      )
  );
$function$;