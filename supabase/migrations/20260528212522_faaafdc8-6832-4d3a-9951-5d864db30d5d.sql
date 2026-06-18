UPDATE public.subscription_tiers
SET included_modules = (
  SELECT ARRAY(SELECT DISTINCT unnest(included_modules || ARRAY['ai-copilot']::text[]))
)
WHERE slug = 'pro';