
-- =========================================================
-- Eligibility (270/271)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.eligibility_checks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL,
  client_id     uuid NOT NULL,
  payer_id      uuid,
  service_date  date NOT NULL DEFAULT current_date,
  service_type  text DEFAULT '30',          -- "Health Benefit Plan Coverage"
  status        text NOT NULL DEFAULT 'pending', -- pending|active|inactive|error
  is_active     boolean,
  member_id     text,
  group_number  text,
  plan_name     text,
  coverage_start date,
  coverage_end   date,
  copay_amount  numeric(10,2),
  deductible_remaining numeric(10,2),
  oop_remaining numeric(10,2),
  raw_271       jsonb,
  error_message text,
  provider      text DEFAULT 'mock',         -- 'changehealthcare','availity','waystar','mock'
  checked_by    uuid,
  checked_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_elig_company_client ON public.eligibility_checks(company_id, client_id, checked_at DESC);
ALTER TABLE public.eligibility_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "elig_select" ON public.eligibility_checks
  FOR SELECT TO authenticated
  USING (public.is_member_of_company(company_id));
CREATE POLICY "elig_insert" ON public.eligibility_checks
  FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of_company(company_id)
              AND public.current_user_has_any_role(ARRAY['admin','billing','scheduler','manager','operations_manager']::app_role[]));

-- =========================================================
-- Telephony EVV
-- =========================================================
CREATE TABLE IF NOT EXISTS public.telephony_phone_registry (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL,
  caregiver_id  uuid NOT NULL,
  phone_e164    text NOT NULL,
  pin_hash      text,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone_e164)
);
ALTER TABLE public.telephony_phone_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telreg_select" ON public.telephony_phone_registry
  FOR SELECT TO authenticated USING (public.is_member_of_company(company_id));
CREATE POLICY "telreg_admin_write" ON public.telephony_phone_registry
  FOR ALL TO authenticated
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));

CREATE TABLE IF NOT EXISTS public.telephony_clock_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid,
  caregiver_id  uuid,
  visit_id      uuid,
  event_type    text NOT NULL CHECK (event_type IN ('clock_in','clock_out','unknown')),
  caller_phone  text,
  ani           text,
  location_code text,
  call_sid      text,
  raw_payload   jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tel_evt_caregiver ON public.telephony_clock_events(caregiver_id, created_at DESC);
ALTER TABLE public.telephony_clock_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tel_evt_select" ON public.telephony_clock_events
  FOR SELECT TO authenticated USING (public.is_member_of_company(company_id));

-- =========================================================
-- Security policy + per-user settings
-- =========================================================
CREATE TABLE IF NOT EXISTS public.company_security_policy (
  company_id          uuid PRIMARY KEY,
  session_timeout_minutes integer NOT NULL DEFAULT 15,
  require_mfa_roles   app_role[] NOT NULL DEFAULT ARRAY['admin','billing']::app_role[],
  updated_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_security_policy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csp_select" ON public.company_security_policy
  FOR SELECT TO authenticated USING (public.is_member_of_company(company_id));
CREATE POLICY "csp_admin_write" ON public.company_security_policy
  FOR ALL TO authenticated
  USING (public.is_company_admin(company_id))
  WITH CHECK (public.is_company_admin(company_id));

CREATE TABLE IF NOT EXISTS public.user_security_settings (
  user_id        uuid PRIMARY KEY,
  mfa_enrolled   boolean NOT NULL DEFAULT false,
  mfa_enrolled_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uss_self" ON public.user_security_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Helper: does current user need MFA?
CREATE OR REPLACE FUNCTION public.user_must_have_mfa()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_security_policy csp
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE csp.company_id = public.current_company_id()
      AND ur.role = ANY(csp.require_mfa_roles)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.user_must_have_mfa() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_must_have_mfa() TO authenticated;
