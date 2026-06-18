
CREATE OR REPLACE FUNCTION public.bootstrap_company_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE std_id uuid;
BEGIN
  SELECT id INTO std_id FROM public.subscription_tiers WHERE slug = 'standard' LIMIT 1;
  INSERT INTO public.company_subscriptions
    (company_id, tier_id, status, trial_ends_at, current_period_start, current_period_end)
  VALUES
    (NEW.id, std_id, 'trialing', now() + interval '90 days', now(), now() + interval '90 days')
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END
$function$;

-- Move any currently trialing companies off legacy Enterprise onto Standard
UPDATE public.company_subscriptions cs
SET tier_id = (SELECT id FROM public.subscription_tiers WHERE slug = 'standard' LIMIT 1)
WHERE cs.status = 'trialing'
  AND cs.external_subscription_id IS NULL
  AND cs.tier_id = (SELECT id FROM public.subscription_tiers WHERE slug = 'enterprise' LIMIT 1);
