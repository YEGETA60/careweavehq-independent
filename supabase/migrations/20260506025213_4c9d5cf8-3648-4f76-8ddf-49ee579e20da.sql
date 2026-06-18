
CREATE TABLE public.subscription_tier_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL,
  tier_slug text NOT NULL,
  tier_name text NOT NULL,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_tier_audit_tier ON public.subscription_tier_audit(tier_id, changed_at DESC);
CREATE INDEX idx_sub_tier_audit_changed_at ON public.subscription_tier_audit(changed_at DESC);

ALTER TABLE public.subscription_tier_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view tier audit"
ON public.subscription_tier_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'));

CREATE OR REPLACE FUNCTION public.log_subscription_tier_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  tracked text[] := ARRAY[
    'name','description','monthly_price','yearly_price',
    'monthly_price_large','yearly_price_large','client_band_threshold',
    'currency','max_users','max_clients','max_caregivers',
    'included_modules','features','active'
  ];
  f text;
  old_v jsonb;
  new_v jsonb;
BEGIN
  FOREACH f IN ARRAY tracked LOOP
    EXECUTE format('SELECT to_jsonb($1.%I), to_jsonb($2.%I)', f, f)
      INTO old_v, new_v USING OLD, NEW;
    IF old_v IS DISTINCT FROM new_v THEN
      INSERT INTO public.subscription_tier_audit
        (tier_id, tier_slug, tier_name, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.slug, NEW.name, f, old_v, new_v, v_user);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_subscription_tiers_audit
AFTER UPDATE ON public.subscription_tiers
FOR EACH ROW EXECUTE FUNCTION public.log_subscription_tier_changes();
