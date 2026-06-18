
-- ============ MEDICATIONS ============
CREATE TABLE public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  name text NOT NULL,
  dose text NOT NULL,
  route text NOT NULL DEFAULT 'oral',
  frequency text NOT NULL,
  scheduled_times text[] DEFAULT '{}',
  is_prn boolean NOT NULL DEFAULT false,
  prn_reason text,
  dose_min numeric,
  dose_max numeric,
  controlled_class text,
  allergy_warnings text[] DEFAULT '{}',
  instructions text,
  prescriber text,
  pharmacy text,
  rx_number text,
  start_date date,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_medications_client ON public.medications(client_id);
CREATE INDEX idx_medications_company ON public.medications(company_id);

CREATE TRIGGER trg_medications_company BEFORE INSERT ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_medications_updated BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY tenant_isolation ON public.medications AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY view_meds ON public.medications FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[])
    OR EXISTS(SELECT 1 FROM visits v JOIN caregivers c ON c.id=v.caregiver_id
              WHERE v.client_id=medications.client_id AND c.user_id=auth.uid())
    OR is_family_of_client(client_id));
CREATE POLICY insert_meds ON public.medications FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY update_meds ON public.medications FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY delete_meds ON public.medications FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- ============ MEDICATION ADMINISTRATIONS (eMAR log) ============
CREATE TABLE public.medication_administrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  visit_id uuid,
  caregiver_id uuid,
  scheduled_time timestamptz,
  administered_at timestamptz,
  status text NOT NULL DEFAULT 'administered', -- administered|refused|missed|held|prn_given
  dose_given text,
  refusal_reason text,
  witness_user_id uuid, -- for controlled substances
  photo_url text,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_medadmin_med ON public.medication_administrations(medication_id);
CREATE INDEX idx_medadmin_visit ON public.medication_administrations(visit_id);
CREATE INDEX idx_medadmin_client ON public.medication_administrations(client_id);

CREATE TRIGGER trg_medadmin_company BEFORE INSERT ON public.medication_administrations
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE POLICY tenant_isolation ON public.medication_administrations AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY view_medadmin ON public.medication_administrations FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[])
    OR EXISTS(SELECT 1 FROM caregivers c WHERE c.id=medication_administrations.caregiver_id AND c.user_id=auth.uid())
    OR is_family_of_client(client_id));
CREATE POLICY insert_medadmin ON public.medication_administrations FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
    OR EXISTS(SELECT 1 FROM caregivers c WHERE c.id=medication_administrations.caregiver_id AND c.user_id=auth.uid()));
CREATE POLICY update_medadmin ON public.medication_administrations FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY delete_medadmin ON public.medication_administrations FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- ============ VITALS ============
CREATE TABLE public.vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  visit_id uuid,
  caregiver_id uuid,
  measured_at timestamptz NOT NULL DEFAULT now(),
  systolic int, diastolic int,
  heart_rate int,
  respiratory_rate int,
  temperature numeric,
  spo2 int,
  weight_lbs numeric,
  blood_glucose int,
  pain_scale int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_vitals_client ON public.vitals(client_id);
CREATE INDEX idx_vitals_visit ON public.vitals(visit_id);

CREATE TRIGGER trg_vitals_company BEFORE INSERT ON public.vitals
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE POLICY tenant_isolation ON public.vitals AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY view_vitals ON public.vitals FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[])
    OR EXISTS(SELECT 1 FROM caregivers c WHERE c.id=vitals.caregiver_id AND c.user_id=auth.uid())
    OR is_family_of_client(client_id));
CREATE POLICY insert_vitals ON public.vitals FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
    OR EXISTS(SELECT 1 FROM caregivers c WHERE c.id=vitals.caregiver_id AND c.user_id=auth.uid()));
CREATE POLICY update_vitals ON public.vitals FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY delete_vitals ON public.vitals FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- ============ ADL LOGS ============
CREATE TABLE public.adl_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  visit_id uuid,
  caregiver_id uuid,
  logged_at timestamptz NOT NULL DEFAULT now(),
  activities jsonb NOT NULL DEFAULT '{}', -- {bathing:'completed', dressing:'assisted', mood:'good', ...}
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.adl_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_adl_client ON public.adl_logs(client_id);
CREATE INDEX idx_adl_visit ON public.adl_logs(visit_id);

CREATE TRIGGER trg_adl_company BEFORE INSERT ON public.adl_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE POLICY tenant_isolation ON public.adl_logs AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY view_adl ON public.adl_logs FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[])
    OR EXISTS(SELECT 1 FROM caregivers c WHERE c.id=adl_logs.caregiver_id AND c.user_id=auth.uid())
    OR is_family_of_client(client_id));
CREATE POLICY insert_adl ON public.adl_logs FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
    OR EXISTS(SELECT 1 FROM caregivers c WHERE c.id=adl_logs.caregiver_id AND c.user_id=auth.uid()));
CREATE POLICY update_adl ON public.adl_logs FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY delete_adl ON public.adl_logs FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- ============ INCIDENTS (full workflow) ============
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid,
  caregiver_id uuid,
  visit_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  reported_by uuid DEFAULT auth.uid(),
  incident_type text NOT NULL, -- fall, medication_error, injury, behavior, property, abuse_alleged, missed_visit, other
  severity text NOT NULL DEFAULT 'low', -- low|medium|high|critical
  location text,
  narrative text NOT NULL,
  witnesses jsonb DEFAULT '[]',
  attachments jsonb DEFAULT '[]',
  immediate_actions text,
  follow_up_actions text,
  root_cause text,
  regulatory_notify boolean NOT NULL DEFAULT false,
  regulatory_notified_at timestamptz,
  status text NOT NULL DEFAULT 'open', -- open|in_review|resolved|closed
  manager_id uuid,
  manager_signed_at timestamptz,
  manager_notes text,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_incidents_client ON public.incidents(client_id);
CREATE INDEX idx_incidents_caregiver ON public.incidents(caregiver_id);
CREATE INDEX idx_incidents_status ON public.incidents(status);

CREATE TRIGGER trg_incidents_company BEFORE INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_incidents_updated BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY tenant_isolation ON public.incidents AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY view_incidents ON public.incidents FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','scheduler']::app_role[])
    OR reported_by = auth.uid()
    OR EXISTS(SELECT 1 FROM caregivers c WHERE c.id=incidents.caregiver_id AND c.user_id=auth.uid()));
CREATE POLICY insert_incidents ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY update_incidents ON public.incidents FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[])
    OR (reported_by = auth.uid() AND status = 'open'));
CREATE POLICY delete_incidents ON public.incidents FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- ============ ASSESSMENTS ============
CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  assessment_type text NOT NULL, -- fall_risk|braden|cognitive|nutrition|pain|custom
  performed_by uuid DEFAULT auth.uid(),
  performed_at timestamptz NOT NULL DEFAULT now(),
  responses jsonb NOT NULL DEFAULT '{}',
  score numeric,
  risk_level text, -- low|moderate|high|severe
  recommendations text,
  next_due date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_assessments_client ON public.assessments(client_id);

CREATE TRIGGER trg_assessments_company BEFORE INSERT ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE POLICY tenant_isolation ON public.assessments AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY view_assessments ON public.assessments FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler','manager','operations_manager','supervisor']::app_role[])
    OR EXISTS(SELECT 1 FROM visits v JOIN caregivers c ON c.id=v.caregiver_id
              WHERE v.client_id=assessments.client_id AND c.user_id=auth.uid())
    OR is_family_of_client(client_id));
CREATE POLICY insert_assessments ON public.assessments FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY update_assessments ON public.assessments FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY delete_assessments ON public.assessments FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- ============ CARE PLAN VERSIONING ============
CREATE TABLE public.care_plan_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  care_plan_id uuid NOT NULL REFERENCES public.care_plans(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  snapshot jsonb NOT NULL, -- full plan content at this version
  change_summary text,
  effective_date date,
  next_review_date date,
  physician_name text,
  physician_signed_at timestamptz,
  physician_signature_data text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.care_plan_versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cpv_plan ON public.care_plan_versions(care_plan_id);
CREATE UNIQUE INDEX idx_cpv_plan_version ON public.care_plan_versions(care_plan_id, version_number);

CREATE TRIGGER trg_cpv_company BEFORE INSERT ON public.care_plan_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE POLICY tenant_isolation ON public.care_plan_versions AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY view_cpv ON public.care_plan_versions FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler','billing','manager','operations_manager','supervisor']::app_role[])
    OR EXISTS(SELECT 1 FROM care_plans cp JOIN visits v ON v.client_id=cp.client_id
              JOIN caregivers c ON c.id=v.caregiver_id
              WHERE cp.id=care_plan_versions.care_plan_id AND c.user_id=auth.uid()));
CREATE POLICY insert_cpv ON public.care_plan_versions FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY update_cpv ON public.care_plan_versions FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));

-- Add current_version pointer to care_plans
ALTER TABLE public.care_plans
  ADD COLUMN IF NOT EXISTS current_version_id uuid,
  ADD COLUMN IF NOT EXISTS next_review_date date;
