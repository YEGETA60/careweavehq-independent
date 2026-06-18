
-- Free tier (new)
INSERT INTO public.subscription_tiers (
  slug, name, description, monthly_price, yearly_price,
  monthly_price_large, yearly_price_large, client_band_threshold,
  currency, max_users, max_clients, max_caregivers,
  included_modules, features, active, sort_order
) VALUES (
  'free',
  'Free',
  'Get started at no cost. Best for trying out CareWeave with a single client.',
  0, 0, NULL, NULL, 2,
  'usd', 2, 2, 3,
  ARRAY['dashboard','myvisits','family','clients','caregivers','scheduling','messages']::text[],
  '["Up to 2 active clients","Up to 3 caregivers","Scheduling & visit tracking","Family portal","In-app messaging","Community support"]'::jsonb,
  true, 0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  monthly_price = EXCLUDED.monthly_price,
  yearly_price = EXCLUDED.yearly_price,
  max_users = EXCLUDED.max_users,
  max_clients = EXCLUDED.max_clients,
  max_caregivers = EXCLUDED.max_caregivers,
  client_band_threshold = EXCLUDED.client_band_threshold,
  included_modules = EXCLUDED.included_modules,
  features = EXCLUDED.features,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order;

-- Basic tier (activate existing row)
UPDATE public.subscription_tiers SET
  name = 'Basic',
  description = 'For small agencies getting organized. EVV-ready scheduling, documentation, and reports.',
  monthly_price = 99,
  yearly_price = 990,
  monthly_price_large = NULL,
  yearly_price_large = NULL,
  client_band_threshold = 10,
  max_users = 10,
  max_clients = 10,
  max_caregivers = 25,
  included_modules = ARRAY[
    'dashboard','myvisits','family','clients','caregivers','scheduling',
    'messages','notes','careplans','company','intake','recurring',
    'credentials','documents','reports'
  ]::text[],
  features = '["Up to 10 active clients","Up to 25 caregivers","EVV-ready scheduling & visit notes","Care plans & client intake","Credential tracking & document storage","Standard reports","Email support"]'::jsonb,
  active = true,
  sort_order = 4
WHERE slug = 'basic';

-- Pro tier (activate existing row)
UPDATE public.subscription_tiers SET
  name = 'Pro',
  description = 'Full operations for growing agencies. Billing, payroll, EVV aggregation, and analytics.',
  monthly_price = 299,
  yearly_price = 2990,
  monthly_price_large = NULL,
  yearly_price_large = NULL,
  client_band_threshold = 10,
  max_users = NULL,
  max_clients = NULL,
  max_caregivers = NULL,
  included_modules = ARRAY[
    'dashboard','myvisits','family','clients','caregivers','scheduling',
    'messages','notes','careplans','company','intake','recurring',
    'credentials','documents','reports','payers','billing','autobilling',
    'payroll','sandata','livemap','hr','training','users','clinical',
    'schedintel','revenue'
  ]::text[],
  features = '["Unlimited clients & caregivers","Everything in Basic","Billing, invoicing & auto-billing","Payroll & payments","Sandata / state EVV aggregation","Live map & scheduling intelligence","HR, training & user admin","Clinical & revenue cycle tools","Priority support"]'::jsonb,
  active = true,
  sort_order = 5
WHERE slug = 'pro';
