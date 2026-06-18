
-- =========================================================
-- Phase 3: Revenue Cycle
-- =========================================================

-- Per-payer rate sheets
CREATE TABLE public.payer_rate_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  payer_id uuid NOT NULL,
  service_code text NOT NULL,
  description text,
  hourly_rate numeric NOT NULL DEFAULT 0,
  unit_minutes integer NOT NULL DEFAULT 60,
  modifier text,
  effective_start date NOT NULL,
  effective_end date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Claims (837 header)
CREATE TABLE public.claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  claim_number text NOT NULL,
  client_id uuid NOT NULL,
  payer_id uuid NOT NULL,
  authorization_id uuid,
  invoice_id uuid,
  service_start date NOT NULL,
  service_end date NOT NULL,
  total_units numeric NOT NULL DEFAULT 0,
  total_charge numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  total_adjusted numeric NOT NULL DEFAULT 0,
  patient_responsibility numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
    -- draft, submitted, accepted, rejected, paid, partial, denied, appealed, closed
  submission_date date,
  control_number text,
  payer_claim_number text,
  edi837_payload jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.claim_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  visit_id uuid,
  service_date date NOT NULL,
  service_code text NOT NULL,
  modifier text,
  units numeric NOT NULL DEFAULT 0,
  unit_rate numeric NOT NULL DEFAULT 0,
  charge numeric NOT NULL DEFAULT 0,
  paid numeric NOT NULL DEFAULT 0,
  adjustment numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Remittances (835)
CREATE TABLE public.remittances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  payer_id uuid NOT NULL,
  remit_number text NOT NULL,
  check_or_eft_number text,
  payment_date date NOT NULL,
  payment_method text NOT NULL DEFAULT 'EFT',
  total_paid numeric NOT NULL DEFAULT 0,
  edi835_payload jsonb,
  posted_at timestamptz,
  posted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.claim_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  remittance_id uuid REFERENCES public.remittances(id) ON DELETE SET NULL,
  payer_id uuid,
  payment_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  adjustment numeric NOT NULL DEFAULT 0,
  payment_type text NOT NULL DEFAULT 'insurance', -- insurance | patient | adjustment | writeoff
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.claim_denials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  denial_code text,
  denial_reason text NOT NULL,
  denial_date date NOT NULL DEFAULT current_date,
  appeal_status text NOT NULL DEFAULT 'none', -- none | drafted | submitted | won | lost
  appeal_submitted_date date,
  appeal_resolved_date date,
  appeal_notes text,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.authorization_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  authorization_id uuid NOT NULL,
  alert_type text NOT NULL, -- burndown_75 | burndown_90 | burndown_100 | expiring_30 | expiring_7 | expired
  threshold_value numeric,
  units_used numeric,
  units_approved numeric,
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_claims_company ON public.claims(company_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_client ON public.claims(client_id);
CREATE INDEX idx_claim_lines_claim ON public.claim_lines(claim_id);
CREATE INDEX idx_claim_payments_claim ON public.claim_payments(claim_id);
CREATE INDEX idx_remit_payer ON public.remittances(payer_id);
CREATE INDEX idx_denials_claim ON public.claim_denials(claim_id);
CREATE INDEX idx_authalerts_auth ON public.authorization_alerts(authorization_id);
CREATE INDEX idx_rates_payer ON public.payer_rate_sheets(payer_id, service_code);

-- Triggers: auto company_id + updated_at
CREATE TRIGGER trg_rates_company BEFORE INSERT ON public.payer_rate_sheets FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_rates_updated BEFORE UPDATE ON public.payer_rate_sheets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_claims_company BEFORE INSERT ON public.claims FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_claims_updated BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_claim_lines_company BEFORE INSERT ON public.claim_lines FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_remit_company BEFORE INSERT ON public.remittances FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_pmt_company BEFORE INSERT ON public.claim_payments FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_denials_company BEFORE INSERT ON public.claim_denials FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_denials_updated BEFORE UPDATE ON public.claim_denials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_authalerts_company BEFORE INSERT ON public.authorization_alerts FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- Enable RLS
ALTER TABLE public.payer_rate_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remittances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_denials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorization_alerts ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation ON public.payer_rate_sheets AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY tenant_isolation ON public.claims AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY tenant_isolation ON public.claim_lines AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY tenant_isolation ON public.remittances AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY tenant_isolation ON public.claim_payments AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY tenant_isolation ON public.claim_denials AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY tenant_isolation ON public.authorization_alerts AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));

-- Role-based access (billing/admin/scheduler)
CREATE POLICY view_rates ON public.payer_rate_sheets FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing','scheduler']::app_role[]));
CREATE POLICY manage_rates ON public.payer_rate_sheets FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY update_rates ON public.payer_rate_sheets FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY delete_rates ON public.payer_rate_sheets FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY view_claims ON public.claims FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing','scheduler']::app_role[]));
CREATE POLICY insert_claims ON public.claims FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY update_claims ON public.claims FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY delete_claims ON public.claims FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY view_lines ON public.claim_lines FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing','scheduler']::app_role[]));
CREATE POLICY manage_lines ON public.claim_lines FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY update_lines ON public.claim_lines FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY delete_lines ON public.claim_lines FOR DELETE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));

CREATE POLICY view_remit ON public.remittances FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY manage_remit ON public.remittances FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY update_remit ON public.remittances FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));

CREATE POLICY view_pmt ON public.claim_payments FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY manage_pmt ON public.claim_payments FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY update_pmt ON public.claim_payments FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));

CREATE POLICY view_denials ON public.claim_denials FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY manage_denials ON public.claim_denials FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY update_denials ON public.claim_denials FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));

CREATE POLICY view_authalerts ON public.authorization_alerts FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing','scheduler']::app_role[]));
CREATE POLICY ack_authalerts ON public.authorization_alerts FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing','scheduler']::app_role[]));
CREATE POLICY insert_authalerts ON public.authorization_alerts FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','billing','scheduler']::app_role[]));

-- Aging buckets function
CREATE OR REPLACE FUNCTION public.claim_aging_buckets(_company uuid)
RETURNS TABLE(bucket text, total_outstanding numeric, claim_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH outstanding AS (
    SELECT id, total_charge - total_paid - total_adjusted AS balance,
           COALESCE(submission_date, service_end) AS age_from
    FROM public.claims
    WHERE company_id = _company
      AND status NOT IN ('paid','closed')
      AND (total_charge - total_paid - total_adjusted) > 0
  )
  SELECT b.bucket,
         COALESCE(SUM(o.balance),0) AS total_outstanding,
         COUNT(o.id)::int AS claim_count
  FROM (VALUES ('0-30',0,30),('31-60',31,60),('61-90',61,90),('90+',91,99999)) AS b(bucket, lo, hi)
  LEFT JOIN outstanding o ON (current_date - o.age_from) BETWEEN b.lo AND b.hi
  GROUP BY b.bucket, b.lo
  ORDER BY b.lo;
$$;

-- Auth burn-down checker (creates alerts; safe to call repeatedly)
CREATE OR REPLACE FUNCTION public.auth_burndown_check()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record; pct numeric; days_left integer; created_count integer := 0;
BEGIN
  FOR r IN SELECT id, company_id, units_approved, end_date FROM public.authorizations WHERE status = 'Active' LOOP
    pct := CASE WHEN r.units_approved > 0
                THEN public.authorization_units_used(r.id) / r.units_approved * 100
                ELSE 0 END;
    days_left := r.end_date - current_date;

    IF pct >= 100 AND NOT EXISTS (SELECT 1 FROM public.authorization_alerts WHERE authorization_id = r.id AND alert_type = 'burndown_100') THEN
      INSERT INTO public.authorization_alerts(company_id, authorization_id, alert_type, threshold_value, units_used, units_approved)
      VALUES (r.company_id, r.id, 'burndown_100', 100, public.authorization_units_used(r.id), r.units_approved);
      created_count := created_count + 1;
    ELSIF pct >= 90 AND NOT EXISTS (SELECT 1 FROM public.authorization_alerts WHERE authorization_id = r.id AND alert_type = 'burndown_90') THEN
      INSERT INTO public.authorization_alerts(company_id, authorization_id, alert_type, threshold_value, units_used, units_approved)
      VALUES (r.company_id, r.id, 'burndown_90', 90, public.authorization_units_used(r.id), r.units_approved);
      created_count := created_count + 1;
    ELSIF pct >= 75 AND NOT EXISTS (SELECT 1 FROM public.authorization_alerts WHERE authorization_id = r.id AND alert_type = 'burndown_75') THEN
      INSERT INTO public.authorization_alerts(company_id, authorization_id, alert_type, threshold_value, units_used, units_approved)
      VALUES (r.company_id, r.id, 'burndown_75', 75, public.authorization_units_used(r.id), r.units_approved);
      created_count := created_count + 1;
    END IF;

    IF days_left <= 0 AND NOT EXISTS (SELECT 1 FROM public.authorization_alerts WHERE authorization_id = r.id AND alert_type = 'expired') THEN
      INSERT INTO public.authorization_alerts(company_id, authorization_id, alert_type) VALUES (r.company_id, r.id, 'expired');
      created_count := created_count + 1;
    ELSIF days_left <= 7 AND days_left > 0 AND NOT EXISTS (SELECT 1 FROM public.authorization_alerts WHERE authorization_id = r.id AND alert_type = 'expiring_7') THEN
      INSERT INTO public.authorization_alerts(company_id, authorization_id, alert_type) VALUES (r.company_id, r.id, 'expiring_7');
      created_count := created_count + 1;
    ELSIF days_left <= 30 AND days_left > 7 AND NOT EXISTS (SELECT 1 FROM public.authorization_alerts WHERE authorization_id = r.id AND alert_type = 'expiring_30') THEN
      INSERT INTO public.authorization_alerts(company_id, authorization_id, alert_type) VALUES (r.company_id, r.id, 'expiring_30');
      created_count := created_count + 1;
    END IF;
  END LOOP;
  RETURN created_count;
END;
$$;
