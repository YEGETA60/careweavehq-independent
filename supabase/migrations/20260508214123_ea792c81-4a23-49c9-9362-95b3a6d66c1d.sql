
-- ============================================================
-- 1. PHI ACCESS LOG (HIPAA §164.312(b))
-- ============================================================
CREATE TABLE public.phi_access_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  company_id  uuid,
  action      text NOT NULL,            -- 'view', 'export', 'print', 'download'
  entity      text NOT NULL,            -- 'client', 'visit', 'care_plan', etc.
  entity_id   uuid,
  reason      text,                     -- 'treatment','payment','operations','audit','patient_request'
  ip_address  text,
  user_agent  text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_phi_log_user_time   ON public.phi_access_log (user_id, created_at DESC);
CREATE INDEX idx_phi_log_entity      ON public.phi_access_log (entity, entity_id);
CREATE INDEX idx_phi_log_company     ON public.phi_access_log (company_id, created_at DESC);

ALTER TABLE public.phi_access_log ENABLE ROW LEVEL SECURITY;

-- Append-only: nobody can update or delete; admins of the company can read.
CREATE POLICY "Admins read phi log"
  ON public.phi_access_log FOR SELECT
  USING (public.is_company_admin(company_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Authenticated users append phi log"
  ON public.phi_access_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Convenience RPC
CREATE OR REPLACE FUNCTION public.log_phi_access(
  _action text, _entity text, _entity_id uuid DEFAULT NULL,
  _reason text DEFAULT 'treatment', _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.phi_access_log (user_id, company_id, action, entity, entity_id, reason, metadata)
  VALUES (auth.uid(), public.current_company_id(), _action, _entity, _entity_id, _reason, coalesce(_metadata,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;

-- ============================================================
-- 2. OIG / SAM EXCLUSION SCANS
-- ============================================================
CREATE TABLE public.exclusion_list_cache (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text NOT NULL,          -- 'OIG_LEIE', 'SAM_GOV'
  last_name    text,
  first_name   text,
  middle_name  text,
  npi          text,
  business_name text,
  address      text,
  city         text,
  state        text,
  zip          text,
  excl_type    text,
  excl_date    date,
  reinstate_date date,
  raw          jsonb,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_excl_npi  ON public.exclusion_list_cache (npi) WHERE npi IS NOT NULL;
CREATE INDEX idx_excl_name ON public.exclusion_list_cache (lower(last_name), lower(first_name));

ALTER TABLE public.exclusion_list_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read exclusion cache"
  ON public.exclusion_list_cache FOR SELECT TO authenticated USING (true);

CREATE TABLE public.exclusion_checks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL,
  caregiver_id  uuid REFERENCES public.caregivers(id) ON DELETE CASCADE,
  source        text NOT NULL,
  status        text NOT NULL,          -- 'clear', 'potential_match', 'excluded', 'error'
  matched_record_id uuid REFERENCES public.exclusion_list_cache(id),
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_excl_check_caregiver ON public.exclusion_checks (caregiver_id, checked_at DESC);
CREATE INDEX idx_excl_check_company   ON public.exclusion_checks (company_id, status);

ALTER TABLE public.exclusion_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company admins read exclusion checks"
  ON public.exclusion_checks FOR SELECT
  USING (public.is_company_admin(company_id) OR public.has_role(auth.uid(),'admin'));

-- ============================================================
-- 3. PRE-VISIT GATING
-- ============================================================
-- Required credential types per company (configurable; default applied if empty).
CREATE TABLE public.company_required_credentials (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL,
  cred_type    text NOT NULL,
  required     boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, cred_type)
);
ALTER TABLE public.company_required_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members read required creds"
  ON public.company_required_credentials FOR SELECT
  USING (public.is_member_of_company(company_id));
CREATE POLICY "Company admins manage required creds"
  ON public.company_required_credentials FOR ALL
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));

CREATE OR REPLACE FUNCTION public.can_caregiver_clock_in(_caregiver_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _company uuid;
  _missing text[] := ARRAY[]::text[];
  _expired text[] := ARRAY[]::text[];
  _excluded boolean := false;
  _required text[];
BEGIN
  SELECT company_id INTO _company FROM public.caregivers WHERE id = _caregiver_id;
  IF _company IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'caregiver_not_found');
  END IF;

  -- Pull required cred types (fallback to a baseline list if none configured)
  SELECT COALESCE(array_agg(cred_type) FILTER (WHERE required), ARRAY[]::text[])
    INTO _required
    FROM public.company_required_credentials
   WHERE company_id = _company;
  IF _required = ARRAY[]::text[] THEN
    _required := ARRAY['CPR','TB_Test'];
  END IF;

  -- Expired credentials (any held that are past expiry)
  SELECT COALESCE(array_agg(DISTINCT type), ARRAY[]::text[]) INTO _expired
    FROM public.credentials
   WHERE caregiver_id = _caregiver_id
     AND expiry_date IS NOT NULL
     AND expiry_date < current_date;

  -- Missing required types (no current valid cred of that type)
  SELECT COALESCE(array_agg(rt), ARRAY[]::text[]) INTO _missing
    FROM unnest(_required) rt
   WHERE NOT EXISTS (
     SELECT 1 FROM public.credentials c
      WHERE c.caregiver_id = _caregiver_id
        AND c.type = rt
        AND (c.expiry_date IS NULL OR c.expiry_date >= current_date)
   );

  -- Active OIG/SAM exclusion?
  SELECT EXISTS (
    SELECT 1 FROM public.exclusion_checks
     WHERE caregiver_id = _caregiver_id
       AND status = 'excluded'
       AND checked_at = (
         SELECT max(checked_at) FROM public.exclusion_checks
          WHERE caregiver_id = _caregiver_id
       )
  ) INTO _excluded;

  RETURN jsonb_build_object(
    'ok', (_missing = ARRAY[]::text[] AND _expired = ARRAY[]::text[] AND NOT _excluded),
    'missing_credentials', _missing,
    'expired_credentials', _expired,
    'excluded', _excluded
  );
END $$;

-- ============================================================
-- 4. FIX PERMISSIVE RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS insert_prebill_alerts ON public.prebill_override_alerts;
CREATE POLICY insert_prebill_alerts
  ON public.prebill_override_alerts FOR INSERT
  WITH CHECK (
    public.is_member_of_company(company_id)
    OR public.has_role(auth.uid(),'admin')
  );

DROP POLICY IF EXISTS "service role manages subscriptions" ON public.company_subscriptions;
CREATE POLICY "Service role manages subscriptions"
  ON public.company_subscriptions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 5. LOCK DOWN SECURITY DEFINER FUNCTION EXECUTE PERMS
-- ============================================================
-- Revoke broad EXECUTE; then grant only to roles that legitimately call them.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant EXECUTE to authenticated for helpers used inside RLS policies and client RPCs.
GRANT EXECUTE ON FUNCTION
  public.has_role(uuid, app_role),
  public.current_user_has_any_role(app_role[]),
  public.is_family_of_client(uuid),
  public.is_family_of_caregiver(uuid),
  public.is_visit_caregiver(uuid),
  public.is_family_of_visit(uuid),
  public.is_caregiver_for_visit(uuid),
  public.is_family_in_company(uuid),
  public.user_can_message(uuid),
  public.is_member_of_company(uuid),
  public.is_company_admin(uuid),
  public.current_company_id(),
  public.user_company_ids(uuid),
  public.caregiver_matches(uuid, text[], text[]),
  public.caregiver_week_hours(uuid, date),
  public.effective_tier_for_company(uuid),
  public.company_billed_price(uuid),
  public.company_active_client_count(uuid),
  public.company_is_read_only(uuid),
  public.authorization_units_used(uuid),
  public.claim_aging_buckets(uuid),
  public.list_users_with_roles(),
  public.redeem_admin_invite(text),
  public.redeem_access_code(text),
  public.caregiver_today_visits(),
  public.recompute_timesheet_unresolved(uuid),
  public.log_phi_access(text, text, uuid, text, jsonb),
  public.can_caregiver_clock_in(uuid)
TO authenticated;
