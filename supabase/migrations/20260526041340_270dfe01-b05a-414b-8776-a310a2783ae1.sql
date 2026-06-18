UPDATE public.subscription_tiers
SET monthly_price = 299, yearly_price = 2990, max_clients = 100
WHERE slug = 'enterprise';