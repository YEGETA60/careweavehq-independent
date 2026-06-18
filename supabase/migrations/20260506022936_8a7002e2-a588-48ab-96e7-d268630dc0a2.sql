
-- Deactivate legacy tiers
UPDATE public.subscription_tiers SET active = false WHERE slug IN ('basic','pro');

-- Upsert three canonical tiers
INSERT INTO public.subscription_tiers (slug, name, description, monthly_price, yearly_price, max_users, max_clients, max_caregivers, included_modules, features, active, sort_order)
VALUES
('starter','Starter','Core operations for solo agencies & very small teams.',49,490,5,25,10,
 ARRAY['dashboard','myvisits','family','clients','caregivers','scheduling','notes','careplans','messages','company']::text[],
 '["Dashboard & basic KPIs","Client & Caregiver profiles","Scheduling & EVV","Visit notes","Basic care plans","Team messaging","Caregiver mobile (My Visits)","Family Portal (read-only)","Up to 5 staff, 25 clients, 10 caregivers"]'::jsonb,
 true, 1),
('professional','Professional','Billing, payroll, compliance & reporting for growing agencies.',149,1490,25,150,75,
 ARRAY['dashboard','myvisits','family','clients','caregivers','scheduling','notes','careplans','messages','company',
       'intake','recurring','credentials','payers','billing','autobilling','payroll','sandata','documents','reports','livemap','hr','training','users']::text[],
 '["Everything in Starter","Digital intake & e-signatures","Recurring visits","Credentials tracking","Payers & authorizations","Billing & invoicing","Auto Billing","Payroll & Payments","Sandata reports","Documents","Reports & Analytics","Live map","HR module","Learning Home (training)","Users & Roles","Up to 25 staff, 150 clients, 75 caregivers"]'::jsonb,
 true, 2),
('enterprise','Enterprise','Everything unlocked. Clinical, AI scheduling, revenue cycle & more.',399,3990,NULL,NULL,NULL,
 ARRAY['dashboard','myvisits','family','clients','caregivers','scheduling','notes','careplans','messages','company',
       'intake','recurring','credentials','payers','billing','autobilling','payroll','sandata','documents','reports','livemap','hr','training','users',
       'clinical','schedintel','revenue','desktop','migrate','webadmin','tiers']::text[],
 '["Everything in Professional","Clinical (eMAR, vitals, ADLs, assessments)","Scheduling Intel (AI matching, OT forecast, geofence)","Revenue Cycle (claims, remits, denials, aging)","Desktop App","Bulk Migration","Web Admin","Subscription Tier admin","Unlimited staff, clients & caregivers","Priority support"]'::jsonb,
 true, 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  max_users = EXCLUDED.max_users,
  max_clients = EXCLUDED.max_clients,
  max_caregivers = EXCLUDED.max_caregivers,
  included_modules = EXCLUDED.included_modules,
  features = EXCLUDED.features,
  active = true,
  sort_order = EXCLUDED.sort_order;

-- Effective tier function (returns enterprise during trial)
CREATE OR REPLACE FUNCTION public.effective_tier_for_company(_company uuid)
RETURNS public.subscription_tiers
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sub public.company_subscriptions%ROWTYPE;
  t public.subscription_tiers%ROWTYPE;
BEGIN
  SELECT * INTO sub FROM public.company_subscriptions WHERE company_id = _company LIMIT 1;
  IF sub.id IS NULL THEN
    SELECT * INTO t FROM public.subscription_tiers WHERE slug = 'starter' LIMIT 1;
    RETURN t;
  END IF;
  IF sub.status = 'trialing' AND sub.trial_ends_at IS NOT NULL AND sub.trial_ends_at > now() THEN
    SELECT * INTO t FROM public.subscription_tiers WHERE slug = 'enterprise' LIMIT 1;
    RETURN t;
  END IF;
  SELECT * INTO t FROM public.subscription_tiers WHERE id = sub.tier_id LIMIT 1;
  IF t.id IS NULL THEN
    SELECT * INTO t FROM public.subscription_tiers WHERE slug = 'starter' LIMIT 1;
  END IF;
  RETURN t;
END $$;

-- Auto-create 30-day Enterprise trial when a company is created
CREATE OR REPLACE FUNCTION public.bootstrap_company_trial()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE ent_id uuid;
BEGIN
  SELECT id INTO ent_id FROM public.subscription_tiers WHERE slug = 'enterprise' LIMIT 1;
  INSERT INTO public.company_subscriptions (company_id, tier_id, status, trial_ends_at, current_period_start, current_period_end)
  VALUES (NEW.id, ent_id, 'trialing', now() + interval '30 days', now(), now() + interval '30 days')
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS companies_bootstrap_trial ON public.companies;
CREATE TRIGGER companies_bootstrap_trial
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_company_trial();

-- Backfill: any existing company without a subscription gets a trial
INSERT INTO public.company_subscriptions (company_id, tier_id, status, trial_ends_at, current_period_start, current_period_end)
SELECT c.id, (SELECT id FROM public.subscription_tiers WHERE slug='enterprise'), 'trialing',
       now() + interval '30 days', now(), now() + interval '30 days'
FROM public.companies c
LEFT JOIN public.company_subscriptions s ON s.company_id = c.id
WHERE s.id IS NULL;
