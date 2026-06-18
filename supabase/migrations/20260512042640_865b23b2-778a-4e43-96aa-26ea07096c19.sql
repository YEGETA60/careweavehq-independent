-- CTA A/B testing + analytics
CREATE TABLE public.cta_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cta_id text NOT NULL UNIQUE,
  location text NOT NULL,
  description text,
  variants jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cta_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cta_id text NOT NULL,
  variant_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('impression','click','conversion')),
  visitor_id text NOT NULL,
  session_id text,
  path text,
  referrer text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cta_events_cta_variant ON public.cta_events (cta_id, variant_id, event_type, created_at);
CREATE INDEX idx_cta_events_visitor ON public.cta_events (visitor_id, created_at);

ALTER TABLE public.cta_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon) can read active experiments for variant assignment
CREATE POLICY "Public can read active experiments"
  ON public.cta_experiments FOR SELECT
  USING (active = true);

-- Only admins manage experiments
CREATE POLICY "Admins manage experiments"
  ON public.cta_experiments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert events (anonymous marketing analytics). Validation trigger enforces sane payloads.
CREATE POLICY "Anyone can record cta events"
  ON public.cta_events FOR INSERT
  WITH CHECK (
    char_length(cta_id) BETWEEN 1 AND 80
    AND char_length(variant_id) BETWEEN 1 AND 40
    AND char_length(visitor_id) BETWEEN 8 AND 80
    AND event_type IN ('impression','click','conversion')
  );

-- Only admins read raw events
CREATE POLICY "Admins read cta events"
  ON public.cta_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_cta_experiments_updated
  BEFORE UPDATE ON public.cta_experiments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Aggregated results view for admin dashboards
CREATE OR REPLACE VIEW public.cta_results AS
SELECT
  cta_id,
  variant_id,
  count(*) FILTER (WHERE event_type='impression') AS impressions,
  count(*) FILTER (WHERE event_type='click') AS clicks,
  count(*) FILTER (WHERE event_type='conversion') AS conversions,
  count(DISTINCT visitor_id) FILTER (WHERE event_type='click') AS unique_clickers,
  count(DISTINCT visitor_id) FILTER (WHERE event_type='conversion') AS unique_converters,
  CASE WHEN count(*) FILTER (WHERE event_type='click') > 0
    THEN round(100.0 * count(*) FILTER (WHERE event_type='conversion')::numeric
               / count(*) FILTER (WHERE event_type='click'), 2)
    ELSE 0 END AS conversion_rate_pct,
  min(created_at) AS first_seen,
  max(created_at) AS last_seen
FROM public.cta_events
GROUP BY cta_id, variant_id;

-- Seed experiments for landing CTAs (2 variants each)
INSERT INTO public.cta_experiments (cta_id, location, description, variants) VALUES
  ('landing_nav_signup', 'landing/nav', 'Top-nav signup button',
    '[{"id":"a","label":"Start free","helper":"30-day trial · no card"},{"id":"b","label":"Try CareWeave","helper":"Free for 30 days"}]'::jsonb),
  ('landing_hero_primary', 'landing/hero', 'Hero email form submit',
    '[{"id":"a","label":"Launch my free trial","helper":"No credit card required"},{"id":"b","label":"Weave my agency in","helper":"Setup in under 10 minutes"}]'::jsonb),
  ('landing_hero_secondary', 'landing/hero', 'Hero secondary demo CTA',
    '[{"id":"a","label":"See it in action","helper":"Book a 20-min walkthrough"},{"id":"b","label":"Watch a live tour","helper":"Hosted by a care-ops lead"}]'::jsonb),
  ('landing_dark_primary', 'landing/why', 'Dark differentiator primary',
    '[{"id":"a","label":"Claim my free trial","helper":"Full Enterprise · 30 days"},{"id":"b","label":"Spin up CareWeave","helper":"Live in minutes, not weeks"}]'::jsonb),
  ('landing_dark_secondary', 'landing/why', 'Dark differentiator secondary',
    '[{"id":"a","label":"Explore plans","helper":"Medicaid · HCBS · Private pay"},{"id":"b","label":"See what fits","helper":"Side-by-side pricing"}]'::jsonb),
  ('landing_footer_primary', 'landing/cta', 'Footer CTA primary',
    '[{"id":"a","label":"Get started free","helper":"No card · cancel anytime"},{"id":"b","label":"Begin the weave","helper":"30 days · everything unlocked"}]'::jsonb),
  ('landing_footer_secondary', 'landing/cta', 'Footer CTA secondary',
    '[{"id":"a","label":"Compare plans","helper":"Find your fit in 60 seconds"},{"id":"b","label":"See pricing","helper":"Transparent · per-client billing"}]'::jsonb),
  ('pricing_main_primary', 'pricing/main', 'Pricing page primary CTA',
    '[{"id":"a","label":"Start my 30-day trial","helper":"Full Enterprise access"},{"id":"b","label":"Try every feature free","helper":"No credit card · no commitment"}]'::jsonb),
  ('pricing_main_secondary', 'pricing/main', 'Pricing page secondary CTA',
    '[{"id":"a","label":"Talk to our team","helper":"Replies in under an hour"},{"id":"b","label":"Get a custom quote","helper":"Built for your client volume"}]'::jsonb),
  ('pricing_segment_cta', 'pricing/segment', 'Persona pricing pages (Medicaid/Private Pay/RC)',
    '[{"id":"a","label":"Activate my trial","helper":"Tailored to your funding model"},{"id":"b","label":"Get fitted","helper":"Configured for your payer mix"}]'::jsonb);