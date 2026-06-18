UPDATE public.subscription_tiers
SET name = 'Standard',
    slug = 'standard',
    description = '90-day FREE trial — full access to core features. After 90 days, your account becomes read-only until you upgrade.',
    trial_duration_days = 90,
    max_clients = 2,
    monthly_price = 0,
    yearly_price = 0
WHERE slug = 'free' OR name ILIKE 'Free Trial';