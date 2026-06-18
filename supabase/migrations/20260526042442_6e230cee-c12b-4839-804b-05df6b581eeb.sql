
-- Reassign any subscriptions on tiers we're removing to Standard
UPDATE public.company_subscriptions
SET tier_id = '6db5352a-d303-4e28-a42a-d175fc4b428e'
WHERE tier_id IN (
  '1df927e0-5750-42a8-92fe-4384d8d524cb', -- starter
  'a784d8d9-ab94-4a34-9c39-2f81369d4f4f', -- basic
  '345a5f78-6017-446e-aea3-7b3a4c3e160d'  -- pro
);

-- Update Professional to the new $99/20-clients model
UPDATE public.subscription_tiers
SET monthly_price = 99,
    yearly_price = 990,
    max_clients = 20,
    description = 'For growing agencies — up to 20 active clients.'
WHERE slug = 'professional';

-- Remove the legacy tiers
DELETE FROM public.subscription_tiers
WHERE slug IN ('starter', 'basic', 'pro');
