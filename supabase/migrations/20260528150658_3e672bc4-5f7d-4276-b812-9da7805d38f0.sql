-- 1. Update tier data: Standard $49 + 45-day trial; Pro & Enterprise also get 45-day trial.
UPDATE public.subscription_tiers SET monthly_price = 49, yearly_price = 490, trial_duration_days = 45 WHERE slug = 'standard';
UPDATE public.subscription_tiers SET trial_duration_days = 45 WHERE slug = 'professional';
UPDATE public.subscription_tiers SET trial_duration_days = 45 WHERE slug = 'enterprise';

-- 2. Free-email-domain allowlist (excluded from domain match)
CREATE TABLE IF NOT EXISTS public.free_email_domains (
  domain text PRIMARY KEY
);
GRANT SELECT ON public.free_email_domains TO authenticated, anon;
GRANT ALL ON public.free_email_domains TO service_role;
ALTER TABLE public.free_email_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "free_email_domains readable by all"
  ON public.free_email_domains FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "free_email_domains superadmin write"
  ON public.free_email_domains FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

INSERT INTO public.free_email_domains(domain) VALUES
  ('gmail.com'),('googlemail.com'),('outlook.com'),('hotmail.com'),('live.com'),('msn.com'),
  ('yahoo.com'),('ymail.com'),('rocketmail.com'),('icloud.com'),('me.com'),('mac.com'),
  ('aol.com'),('proton.me'),('protonmail.com'),('pm.me'),('zoho.com'),('gmx.com'),('gmx.us'),
  ('mail.com'),('yandex.com'),('fastmail.com'),('hey.com'),('tutanota.com'),('duck.com')
ON CONFLICT (domain) DO NOTHING;

-- 3. trial_history ledger
CREATE TABLE IF NOT EXISTS public.trial_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE,
  tier_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  ended_reason text,
  tax_id_norm text,
  email_domain text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trial_history_tax_id_norm_idx ON public.trial_history(tax_id_norm) WHERE tax_id_norm IS NOT NULL AND tax_id_norm <> '';
CREATE INDEX IF NOT EXISTS trial_history_email_domain_idx ON public.trial_history(email_domain) WHERE email_domain IS NOT NULL;

GRANT SELECT ON public.trial_history TO authenticated;
GRANT ALL ON public.trial_history TO service_role;
ALTER TABLE public.trial_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trial_history members read"
  ON public.trial_history FOR SELECT TO authenticated
  USING (public.is_member_of_company(company_id) OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "trial_history superadmin write"
  ON public.trial_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- 4. company_has_used_trial fingerprint check
CREATE OR REPLACE FUNCTION public.company_has_used_trial(_company uuid, _tax_id text, _email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _norm text := NULLIF(regexp_replace(lower(coalesce(_tax_id,'')), '[^0-9]', '', 'g'), '');
  _domain text := lower(split_part(coalesce(_email,''), '@', 2));
  _is_free boolean := false;
BEGIN
  IF _company IS NOT NULL AND EXISTS (SELECT 1 FROM public.trial_history WHERE company_id = _company) THEN
    RETURN true;
  END IF;
  IF _norm IS NOT NULL AND EXISTS (SELECT 1 FROM public.trial_history WHERE tax_id_norm = _norm) THEN
    RETURN true;
  END IF;
  IF _domain <> '' THEN
    SELECT EXISTS (SELECT 1 FROM public.free_email_domains WHERE domain = _domain) INTO _is_free;
    IF NOT _is_free AND EXISTS (SELECT 1 FROM public.trial_history WHERE email_domain = _domain) THEN
      RETURN true;
    END IF;
  END IF;
  RETURN false;
END;
$$;

-- 5. Rewrite bootstrap_company_trial to honor signup_tier, 45 days, one-per-company
CREATE OR REPLACE FUNCTION public.bootstrap_company_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier_slug text := COALESCE(NEW.settings->>'signup_tier', 'standard');
  _tier public.subscription_tiers%ROWTYPE;
  _owner_email text;
  _domain text;
  _is_free boolean;
  _used boolean;
  _trial_days int;
BEGIN
  -- Resolve requested tier; fall back to Standard.
  SELECT * INTO _tier FROM public.subscription_tiers WHERE slug = _tier_slug AND active = true LIMIT 1;
  IF _tier.id IS NULL THEN
    SELECT * INTO _tier FROM public.subscription_tiers WHERE slug = 'standard' LIMIT 1;
  END IF;
  _trial_days := COALESCE(_tier.trial_duration_days, 45);

  -- Owner email comes from the creator's auth account.
  SELECT email INTO _owner_email FROM auth.users WHERE id = NEW.created_by;
  _domain := NULLIF(lower(split_part(coalesce(_owner_email,''), '@', 2)), '');
  IF _domain IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.free_email_domains WHERE domain = _domain) INTO _is_free;
    IF _is_free THEN _domain := NULL; END IF;
  END IF;

  _used := public.company_has_used_trial(NULL, NEW.tax_id, _owner_email);

  IF _used THEN
    -- Trial already consumed by this organization: create read-only sub, no trial.
    INSERT INTO public.company_subscriptions
      (company_id, tier_id, status, current_period_start, current_period_end)
    VALUES
      (NEW.id, _tier.id, 'past_due', now(), now())
    ON CONFLICT (company_id) DO NOTHING;
  ELSE
    INSERT INTO public.company_subscriptions
      (company_id, tier_id, status, trial_ends_at, current_period_start, current_period_end)
    VALUES
      (NEW.id, _tier.id, 'trialing', now() + (_trial_days || ' days')::interval, now(), now() + (_trial_days || ' days')::interval)
    ON CONFLICT (company_id) DO NOTHING;

    INSERT INTO public.trial_history
      (company_id, tier_id, started_at, ends_at, tax_id_norm, email_domain, created_by)
    VALUES
      (NEW.id, _tier.id, now(), now() + (_trial_days || ' days')::interval,
       NULLIF(regexp_replace(lower(coalesce(NEW.tax_id,'')), '[^0-9]', '', 'g'), ''),
       _domain, NEW.created_by)
    ON CONFLICT (company_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Backfill trial_history for existing companies so they can't re-trial.
INSERT INTO public.trial_history (company_id, tier_id, started_at, ends_at, ended_reason, tax_id_norm, email_domain, created_by)
SELECT
  cs.company_id,
  cs.tier_id,
  COALESCE(cs.created_at, now()),
  cs.trial_ends_at,
  CASE WHEN cs.external_subscription_id IS NOT NULL THEN 'converted'
       WHEN cs.status = 'trialing' THEN NULL
       ELSE cs.status END,
  NULLIF(regexp_replace(lower(coalesce(c.tax_id,'')), '[^0-9]', '', 'g'), ''),
  NULLIF(lower(split_part(coalesce(u.email,''), '@', 2)), ''),
  c.created_by
FROM public.company_subscriptions cs
JOIN public.companies c ON c.id = cs.company_id
LEFT JOIN auth.users u ON u.id = c.created_by
ON CONFLICT (company_id) DO NOTHING;