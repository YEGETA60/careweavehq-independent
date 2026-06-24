-- Restore independent beta trial behavior after moving off Lovable.
--
-- In the self-hosted beta, Stripe/payment providers are intentionally disabled.
-- Any company without an external subscription should have an active 45-day
-- full-access Enterprise trial instead of being locked into Starter/past_due.

CREATE OR REPLACE FUNCTION public.bootstrap_company_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _requested_slug text := COALESCE(NULLIF(NEW.settings->>'signup_tier', ''), 'enterprise');
  _trial_tier_id uuid;
  _trial_days int := 45;
  _owner_email text;
  _domain text;
BEGIN
  SELECT id, COALESCE(trial_duration_days, 45)
    INTO _trial_tier_id, _trial_days
  FROM public.subscription_tiers
  WHERE slug = 'enterprise' AND active = true
  LIMIT 1;

  IF _trial_tier_id IS NULL THEN
    SELECT id, COALESCE(trial_duration_days, 45)
      INTO _trial_tier_id, _trial_days
    FROM public.subscription_tiers
    WHERE slug = _requested_slug AND active = true
    LIMIT 1;
  END IF;

  IF _trial_tier_id IS NULL THEN
    SELECT id, COALESCE(trial_duration_days, 45)
      INTO _trial_tier_id, _trial_days
    FROM public.subscription_tiers
    WHERE slug = 'standard' AND active = true
    LIMIT 1;
  END IF;

  INSERT INTO public.company_subscriptions
    (company_id, tier_id, status, trial_ends_at, current_period_start, current_period_end)
  VALUES
    (NEW.id, _trial_tier_id, 'trialing', now() + (_trial_days || ' days')::interval, now(), now() + (_trial_days || ' days')::interval)
  ON CONFLICT (company_id) DO UPDATE
  SET tier_id = COALESCE(EXCLUDED.tier_id, public.company_subscriptions.tier_id),
      status = 'trialing',
      trial_ends_at = GREATEST(
        COALESCE(public.company_subscriptions.trial_ends_at, now()),
        EXCLUDED.trial_ends_at
      ),
      current_period_start = COALESCE(public.company_subscriptions.current_period_start, EXCLUDED.current_period_start),
      current_period_end = GREATEST(
        COALESCE(public.company_subscriptions.current_period_end, now()),
        EXCLUDED.current_period_end
      ),
      updated_at = now()
  WHERE public.company_subscriptions.external_subscription_id IS NULL;

  SELECT email INTO _owner_email FROM auth.users WHERE id = NEW.created_by;
  _domain := NULLIF(lower(split_part(coalesce(_owner_email, ''), '@', 2)), '');

  IF _domain IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.free_email_domains WHERE domain = _domain
  ) THEN
    _domain := NULL;
  END IF;

  INSERT INTO public.trial_history
    (company_id, tier_id, started_at, ends_at, tax_id_norm, email_domain, created_by)
  VALUES
    (
      NEW.id,
      _trial_tier_id,
      now(),
      now() + (_trial_days || ' days')::interval,
      NULLIF(regexp_replace(lower(coalesce(NEW.tax_id, '')), '[^0-9]', '', 'g'), ''),
      _domain,
      NEW.created_by
    )
  ON CONFLICT (company_id) DO UPDATE
  SET tier_id = EXCLUDED.tier_id,
      started_at = LEAST(public.trial_history.started_at, EXCLUDED.started_at),
      ends_at = GREATEST(COALESCE(public.trial_history.ends_at, now()), EXCLUDED.ends_at),
      ended_reason = NULL;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.effective_tier_for_company(_company uuid)
RETURNS public.subscription_tiers
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
    SELECT * INTO _tier
    FROM public.subscription_tiers
    WHERE slug = 'standard' AND active = true
    LIMIT 1;
    RETURN _tier;
  END IF;

  IF _sub.status = 'trialing'
     AND _sub.trial_ends_at IS NOT NULL
     AND _sub.trial_ends_at > now() THEN
    SELECT * INTO _tier
    FROM public.subscription_tiers
    WHERE slug = 'enterprise' AND active = true
    LIMIT 1;
    RETURN _tier;
  END IF;

  SELECT * INTO _tier
  FROM public.subscription_tiers
  WHERE id = _sub.tier_id AND active = true
  LIMIT 1;

  IF _tier.id IS NULL THEN
    SELECT * INTO _tier
    FROM public.subscription_tiers
    WHERE slug = 'standard' AND active = true
    LIMIT 1;
  END IF;

  RETURN _tier;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.effective_tier_for_company(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.effective_tier_for_company(uuid)
  TO authenticated, service_role;

WITH tiers AS (
  SELECT
    (SELECT id FROM public.subscription_tiers WHERE slug = 'enterprise' AND active = true LIMIT 1) AS enterprise_id,
    (SELECT id FROM public.subscription_tiers WHERE slug = 'standard' AND active = true LIMIT 1) AS standard_id
)
INSERT INTO public.company_subscriptions
  (company_id, tier_id, status, trial_ends_at, current_period_start, current_period_end)
SELECT
  c.id,
  COALESCE(tiers.enterprise_id, tiers.standard_id),
  'trialing',
  now() + interval '45 days',
  now(),
  now() + interval '45 days'
FROM public.companies c
CROSS JOIN tiers
WHERE COALESCE(tiers.enterprise_id, tiers.standard_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.company_subscriptions cs
    WHERE cs.company_id = c.id
  )
ON CONFLICT (company_id) DO NOTHING;

WITH tiers AS (
  SELECT
    (SELECT id FROM public.subscription_tiers WHERE slug = 'enterprise' AND active = true LIMIT 1) AS enterprise_id,
    (SELECT id FROM public.subscription_tiers WHERE slug = 'standard' AND active = true LIMIT 1) AS standard_id
)
UPDATE public.company_subscriptions cs
SET tier_id = COALESCE(tiers.enterprise_id, tiers.standard_id, cs.tier_id),
    status = 'trialing',
    trial_ends_at = GREATEST(COALESCE(cs.trial_ends_at, now()), now() + interval '45 days'),
    current_period_start = COALESCE(cs.current_period_start, now()),
    current_period_end = GREATEST(COALESCE(cs.current_period_end, now()), now() + interval '45 days'),
    updated_at = now()
FROM tiers
WHERE cs.external_subscription_id IS NULL;

INSERT INTO public.trial_history
  (company_id, tier_id, started_at, ends_at, tax_id_norm, email_domain, created_by)
SELECT
  cs.company_id,
  cs.tier_id,
  COALESCE(cs.current_period_start, now()),
  cs.trial_ends_at,
  NULLIF(regexp_replace(lower(coalesce(c.tax_id, '')), '[^0-9]', '', 'g'), ''),
  CASE
    WHEN fed.domain IS NOT NULL THEN NULL
    ELSE NULLIF(lower(split_part(coalesce(u.email, ''), '@', 2)), '')
  END,
  c.created_by
FROM public.company_subscriptions cs
JOIN public.companies c ON c.id = cs.company_id
LEFT JOIN auth.users u ON u.id = c.created_by
LEFT JOIN public.free_email_domains fed
  ON fed.domain = lower(split_part(coalesce(u.email, ''), '@', 2))
WHERE cs.status = 'trialing'
  AND cs.trial_ends_at > now()
ON CONFLICT (company_id) DO UPDATE
SET tier_id = EXCLUDED.tier_id,
    started_at = LEAST(public.trial_history.started_at, EXCLUDED.started_at),
    ends_at = GREATEST(COALESCE(public.trial_history.ends_at, now()), EXCLUDED.ends_at),
    ended_reason = NULL;
