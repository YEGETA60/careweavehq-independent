CREATE TABLE IF NOT EXISTS public.claim_status_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  submission_id uuid REFERENCES public.claim_submissions(id) ON DELETE SET NULL,
  status_code text, status_category text, status_description text,
  effective_date date, payer_claim_control_number text,
  raw_response jsonb DEFAULT '{}'::jsonb,
  checked_by uuid, checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_status_claim ON public.claim_status_checks(claim_id, checked_at DESC);
ALTER TABLE public.claim_status_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claim_status_company_read" ON public.claim_status_checks
  FOR SELECT TO authenticated
  USING (is_member_of_company(company_id) AND current_user_has_any_role(ARRAY['admin','manager','billing','operations_manager']::app_role[]));
CREATE POLICY "claim_status_company_write" ON public.claim_status_checks
  FOR INSERT TO authenticated
  WITH CHECK (is_member_of_company(company_id) AND current_user_has_any_role(ARRAY['admin','billing']::app_role[]));

CREATE TABLE IF NOT EXISTS public.breach_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  discovered_at timestamptz NOT NULL,
  occurred_at timestamptz,
  affected_individuals_count integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  phi_types text[] DEFAULT ARRAY[]::text[],
  cause text, containment_actions text,
  notification_sent_at timestamptz, hhs_reported_at timestamptz, media_reported_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  reported_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_breach_updated BEFORE UPDATE ON public.breach_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.breach_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "breach_admin_only" ON public.breach_notifications
  FOR ALL TO authenticated
  USING (is_member_of_company(company_id) AND current_user_has_any_role(ARRAY['admin']::app_role[]))
  WITH CHECK (is_member_of_company(company_id) AND current_user_has_any_role(ARRAY['admin']::app_role[]));

CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  entity text NOT NULL,
  retention_years integer NOT NULL DEFAULT 7,
  enabled boolean NOT NULL DEFAULT true,
  legal_basis text DEFAULT 'HIPAA §164.316(b)(2)(i) — 6 years minimum',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, entity)
);
CREATE TRIGGER trg_retention_updated BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retention_admin" ON public.data_retention_policies
  FOR ALL TO authenticated
  USING (is_member_of_company(company_id) AND current_user_has_any_role(ARRAY['admin']::app_role[]))
  WITH CHECK (is_member_of_company(company_id) AND current_user_has_any_role(ARRAY['admin']::app_role[]));

CREATE TABLE IF NOT EXISTS public.data_purge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  entity text NOT NULL,
  records_purged integer NOT NULL DEFAULT 0,
  oldest_purged_at timestamptz, newest_purged_at timestamptz,
  policy_years integer,
  executed_by uuid,
  executed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.data_purge_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purge_log_admin_read" ON public.data_purge_log
  FOR SELECT TO authenticated
  USING (is_member_of_company(company_id) AND current_user_has_any_role(ARRAY['admin']::app_role[]));

CREATE TABLE IF NOT EXISTS public.supervisory_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  caregiver_id uuid REFERENCES public.caregivers(id) ON DELETE SET NULL,
  supervisor_id uuid,
  scheduled_date date NOT NULL,
  completed_date date,
  findings text,
  competency_rating integer CHECK (competency_rating BETWEEN 1 AND 5),
  client_satisfaction integer CHECK (client_satisfaction BETWEEN 1 AND 5),
  corrective_action_required boolean DEFAULT false,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supervisory_client ON public.supervisory_visits(client_id, scheduled_date DESC);
CREATE TRIGGER trg_supervisory_updated BEFORE UPDATE ON public.supervisory_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.supervisory_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supervisory_company_manage" ON public.supervisory_visits
  FOR ALL TO authenticated
  USING (is_member_of_company(company_id) AND current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]))
  WITH CHECK (is_member_of_company(company_id) AND current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "supervisory_caregiver_read" ON public.supervisory_visits
  FOR SELECT TO authenticated
  USING (caregiver_id IN (SELECT id FROM public.caregivers WHERE user_id = auth.uid()));

CREATE OR REPLACE VIEW public.unsigned_care_plans_30d AS
SELECT cp.id AS care_plan_id, cp.client_id, cp.company_id, c.name AS client_name,
       cp.created_at, cpv.physician_signed_at,
       (current_date - cp.created_at::date) AS days_since_created
FROM public.care_plans cp
JOIN public.clients c ON c.id = cp.client_id
LEFT JOIN public.care_plan_versions cpv ON cpv.id = cp.current_version_id
WHERE (cpv.physician_signed_at IS NULL)
  AND (current_date - cp.created_at::date) >= 30
  AND cp.active = true;

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE (bucket_key, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.rate_limit_counters(window_start);
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rate_limit_check(_key text, _window_seconds integer, _max_requests integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _window_start timestamptz := date_trunc('second', now()) - (extract(epoch FROM now())::int % _window_seconds) * interval '1 second';
  _count integer;
BEGIN
  INSERT INTO public.rate_limit_counters (bucket_key, window_start, request_count)
  VALUES (_key, _window_start, 1)
  ON CONFLICT (bucket_key, window_start) DO UPDATE SET request_count = rate_limit_counters.request_count + 1
  RETURNING request_count INTO _count;
  DELETE FROM public.rate_limit_counters WHERE window_start < now() - interval '1 hour';
  RETURN _count <= _max_requests;
END $$;
REVOKE EXECUTE ON FUNCTION public.rate_limit_check(text,integer,integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.execute_data_purge(_entity text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company uuid := current_company_id();
  _years integer;
  _purged integer := 0;
  _cutoff timestamptz;
BEGIN
  IF NOT current_user_has_any_role(ARRAY['admin']::app_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT retention_years INTO _years FROM public.data_retention_policies
   WHERE company_id = _company AND entity = _entity AND enabled = true;
  IF _years IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_policy');
  END IF;
  _cutoff := now() - (_years || ' years')::interval;
  IF _entity = 'audit_log' THEN
    DELETE FROM public.audit_log WHERE created_at < _cutoff; GET DIAGNOSTICS _purged = ROW_COUNT;
  ELSIF _entity = 'phi_access_log' THEN
    DELETE FROM public.phi_access_log WHERE created_at < _cutoff; GET DIAGNOSTICS _purged = ROW_COUNT;
  ELSIF _entity = 'messages' THEN
    DELETE FROM public.messages WHERE created_at < _cutoff; GET DIAGNOSTICS _purged = ROW_COUNT;
  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'entity_not_supported');
  END IF;
  INSERT INTO public.data_purge_log (company_id, entity, records_purged, policy_years, executed_by)
  VALUES (_company, _entity, _purged, _years, auth.uid());
  RETURN jsonb_build_object('ok', true, 'purged', _purged, 'cutoff', _cutoff);
END $$;
REVOKE EXECUTE ON FUNCTION public.execute_data_purge(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_data_purge(text) TO authenticated;