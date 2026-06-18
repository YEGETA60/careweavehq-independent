
ALTER TABLE public.company_subscriptions
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_price_id text;

CREATE TABLE IF NOT EXISTS public.subscription_price_map (
  price_id text PRIMARY KEY,
  tier_slug text NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  client_band text NOT NULL CHECK (client_band IN ('small','large')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_price_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone authenticated can read price map"
  ON public.subscription_price_map FOR SELECT TO authenticated USING (true);

INSERT INTO public.subscription_price_map (price_id, tier_slug, billing_cycle, client_band) VALUES
  ('starter_small_monthly','starter','monthly','small'),
  ('starter_small_yearly','starter','yearly','small'),
  ('starter_large_monthly','starter','monthly','large'),
  ('starter_large_yearly','starter','yearly','large'),
  ('professional_small_monthly','professional','monthly','small'),
  ('professional_small_yearly','professional','yearly','small'),
  ('professional_large_monthly','professional','monthly','large'),
  ('professional_large_yearly','professional','yearly','large'),
  ('enterprise_small_monthly','enterprise','monthly','small'),
  ('enterprise_small_yearly','enterprise','yearly','small'),
  ('enterprise_large_monthly','enterprise','monthly','large'),
  ('enterprise_large_yearly','enterprise','yearly','large')
ON CONFLICT (price_id) DO NOTHING;

CREATE POLICY "service role manages subscriptions"
  ON public.company_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.company_is_read_only(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_subscriptions
    WHERE company_id = _company
      AND status IN ('canceled','unpaid','incomplete_expired')
      AND (current_period_end IS NULL OR current_period_end < now())
  );
$$;
