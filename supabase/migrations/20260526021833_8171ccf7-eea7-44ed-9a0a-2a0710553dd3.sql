
-- Drop access codes and reviewer invites systems
DROP FUNCTION IF EXISTS public.redeem_access_code(text) CASCADE;
DROP FUNCTION IF EXISTS public.redeem_reviewer_invite(text) CASCADE;
DROP FUNCTION IF EXISTS public.revoke_reviewer_invite(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.expire_reviewer_access() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_is_reviewer() CASCADE;
DROP FUNCTION IF EXISTS public.block_reviewer_writes() CASCADE;
DROP TABLE IF EXISTS public.access_codes CASCADE;
DROP TABLE IF EXISTS public.reviewer_invites CASCADE;

-- Update company trial bootstrap from 30 to 90 days
CREATE OR REPLACE FUNCTION public.bootstrap_company_trial()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE ent_id uuid;
BEGIN
  SELECT id INTO ent_id FROM public.subscription_tiers WHERE slug = 'enterprise' LIMIT 1;
  INSERT INTO public.company_subscriptions (company_id, tier_id, status, trial_ends_at, current_period_start, current_period_end)
  VALUES (NEW.id, ent_id, 'trialing', now() + interval '90 days', now(), now() + interval '90 days')
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END $function$;
