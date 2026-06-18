ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS client_band_threshold int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS monthly_price_large numeric(10,2),
  ADD COLUMN IF NOT EXISTS yearly_price_large numeric(10,2);

UPDATE public.subscription_tiers SET monthly_price = 49, yearly_price = 490, monthly_price_large = 149, yearly_price_large = 1490 WHERE slug='starter';
UPDATE public.subscription_tiers SET monthly_price = 149, yearly_price = 1490, monthly_price_large = 399, yearly_price_large = 3990 WHERE slug='professional';
UPDATE public.subscription_tiers SET monthly_price = 399, yearly_price = 3990, monthly_price_large = 499, yearly_price_large = 4990 WHERE slug='enterprise';

CREATE OR REPLACE FUNCTION public.company_active_client_count(_company uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT count(*)::int FROM public.clients WHERE company_id=_company AND status='active' $$;

CREATE OR REPLACE FUNCTION public.company_billed_price(_company uuid)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.subscription_tiers; n int;
BEGIN
  SELECT * INTO t FROM public.effective_tier_for_company(_company);
  n := public.company_active_client_count(_company);
  IF n > t.client_band_threshold AND t.monthly_price_large IS NOT NULL
     THEN RETURN t.monthly_price_large; ELSE RETURN t.monthly_price; END IF;
END $$;