-- Ensure active beta trials receive full Enterprise module access and repair
-- companies created during the clean Cloud migration that have no usable
-- subscription row.

CREATE OR REPLACE FUNCTION public.effective_tier_for_company(_company uuid)
RETURNS SETOF public.subscription_tiers
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub public.company_subscriptions%ROWTYPE;
  _tier public.subscription_tiers%ROWTYPE;
BEGIN
  SELECT * INTO _sub
  FROM public.company_subscriptions
  WHERE company_id = _company
  LIMIT 1;

  IF _sub.id IS NULL THEN
    RETURN QUERY
      SELECT * FROM public.subscription_tiers
      WHERE slug = 'standard' AND active = true
      LIMIT 1;
    RETURN;
  END IF;

  IF _sub.status = 'trialing'
     AND _sub.trial_ends_at IS NOT NULL
     AND _sub.trial_ends_at > now() THEN
    RETURN QUERY
      SELECT * FROM public.subscription_tiers
      WHERE slug = 'enterprise' AND active = true
      LIMIT 1;
    RETURN;
  END IF;

  SELECT * INTO _tier
  FROM public.subscription_tiers
  WHERE id = _sub.tier_id AND active = true
  LIMIT 1;

  IF _tier.id IS NULL THEN
    RETURN QUERY
      SELECT * FROM public.subscription_tiers
      WHERE slug = 'standard' AND active = true
      LIMIT 1;
  ELSE
    RETURN NEXT _tier;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.effective_tier_for_company(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_tier_for_company(uuid)
  TO authenticated, service_role;

-- Create a trial row for any company that missed the bootstrap trigger.
INSERT INTO public.company_subscriptions
  (company_id, tier_id, status, trial_ends_at, current_period_start, current_period_end)
SELECT
  c.id,
  COALESCE(
    requested.id,
    standard.id,
    enterprise.id
  ),
  'trialing',
  now() + interval '45 days',
  now(),
  now() + interval '45 days'
FROM public.companies c
LEFT JOIN public.subscription_tiers requested
  ON requested.slug = COALESCE(c.settings->>'signup_tier', 'standard')
 AND requested.active = true
LEFT JOIN public.subscription_tiers standard
  ON standard.slug = 'standard' AND standard.active = true
LEFT JOIN public.subscription_tiers enterprise
  ON enterprise.slug = 'enterprise' AND enterprise.active = true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.company_subscriptions cs
  WHERE cs.company_id = c.id
)
ON CONFLICT (company_id) DO NOTHING;

-- Repair non-paid beta subscriptions created in this new Cloud project.
UPDATE public.company_subscriptions
SET status = 'trialing',
    trial_ends_at = now() + interval '45 days',
    current_period_start = now(),
    current_period_end = now() + interval '45 days',
    updated_at = now()
WHERE external_subscription_id IS NULL
  AND created_at >= timestamptz '2026-06-18 00:00:00+00'
  AND (
    status <> 'trialing'
    OR trial_ends_at IS NULL
    OR trial_ends_at <= now()
  );

-- Keep the one-trial ledger aligned with repaired subscriptions.
INSERT INTO public.trial_history
  (company_id, tier_id, started_at, ends_at, tax_id_norm, email_domain, created_by)
SELECT
  cs.company_id,
  cs.tier_id,
  COALESCE(cs.current_period_start, now()),
  cs.trial_ends_at,
  NULLIF(regexp_replace(lower(coalesce(c.tax_id, '')), '[^0-9]', '', 'g'), ''),
  NULLIF(lower(split_part(coalesce(u.email, ''), '@', 2)), ''),
  c.created_by
FROM public.company_subscriptions cs
JOIN public.companies c ON c.id = cs.company_id
LEFT JOIN auth.users u ON u.id = c.created_by
WHERE cs.status = 'trialing'
  AND cs.trial_ends_at > now()
ON CONFLICT (company_id) DO UPDATE
SET tier_id = EXCLUDED.tier_id,
    started_at = EXCLUDED.started_at,
    ends_at = EXCLUDED.ends_at,
    ended_reason = NULL;
