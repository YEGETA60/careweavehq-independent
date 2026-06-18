-- Align the database catalog with the pricing displayed by the application.
UPDATE public.subscription_tiers
SET monthly_price = 99,
    yearly_price = 990,
    trial_duration_days = 45
WHERE slug = 'standard';

UPDATE public.subscription_tiers
SET monthly_price = 199,
    yearly_price = 1990,
    trial_duration_days = 45
WHERE slug = 'professional';

UPDATE public.subscription_tiers
SET monthly_price = 299,
    yearly_price = 2990,
    trial_duration_days = 45
WHERE slug = 'enterprise';

DELETE FROM public.subscription_price_map
WHERE tier_slug = 'starter'
   OR price_id LIKE 'starter_%';

INSERT INTO public.subscription_price_map
  (price_id, tier_slug, billing_cycle, client_band)
VALUES
  ('standard_small_monthly', 'standard', 'monthly', 'small'),
  ('standard_small_yearly', 'standard', 'yearly', 'small'),
  ('standard_large_monthly', 'standard', 'monthly', 'large'),
  ('standard_large_yearly', 'standard', 'yearly', 'large'),
  ('professional_small_monthly', 'professional', 'monthly', 'small'),
  ('professional_small_yearly', 'professional', 'yearly', 'small'),
  ('professional_large_monthly', 'professional', 'monthly', 'large'),
  ('professional_large_yearly', 'professional', 'yearly', 'large'),
  ('enterprise_small_monthly', 'enterprise', 'monthly', 'small'),
  ('enterprise_small_yearly', 'enterprise', 'yearly', 'small'),
  ('enterprise_large_monthly', 'enterprise', 'monthly', 'large'),
  ('enterprise_large_yearly', 'enterprise', 'yearly', 'large')
ON CONFLICT (price_id) DO UPDATE
SET tier_slug = EXCLUDED.tier_slug,
    billing_cycle = EXCLUDED.billing_cycle,
    client_band = EXCLUDED.client_band;
