CREATE TABLE public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'compliance',
  provider text,
  external_url text,
  duration_minutes integer,
  required_for_roles app_role[] NOT NULL DEFAULT '{}',
  renewal_months integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone signed-in views courses" ON public.training_courses
  FOR SELECT TO authenticated USING (active OR current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY "admin manage courses ins" ON public.training_courses
  FOR INSERT TO authenticated WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY "admin manage courses upd" ON public.training_courses
  FOR UPDATE TO authenticated USING (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY "admin manage courses del" ON public.training_courses
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE public.training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  certificate_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id, completed_at)
);
CREATE INDEX idx_training_completions_user ON public.training_completions(user_id);
ALTER TABLE public.training_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own or admin completions" ON public.training_completions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY "self insert completion" ON public.training_completions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY "self or admin update" ON public.training_completions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY "admin delete completion" ON public.training_completions
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Seed standard courses
INSERT INTO public.training_courses (title, description, category, provider, external_url, duration_minutes, required_for_roles, renewal_months) VALUES
('HIPAA Privacy & Security Awareness', 'Federal HIPAA training covering PHI handling, patient rights, breach notification, and security safeguards.', 'HIPAA', 'HHS.gov', 'https://www.hhs.gov/hipaa/for-professionals/training/index.html', 60, ARRAY['admin','scheduler','caregiver','billing']::app_role[], 12),
('OSHA Bloodborne Pathogens', 'OSHA standard 1910.1030 training for staff with potential exposure to blood or bodily fluids.', 'OSHA', 'OSHA.gov', 'https://www.osha.gov/bloodborne-pathogens', 45, ARRAY['caregiver']::app_role[], 12),
('Abuse, Neglect & Exploitation Reporting', 'Mandated reporter training: identifying and reporting abuse, neglect, and exploitation of vulnerable adults.', 'Compliance', 'NAPSA', 'https://www.napsa-now.org/get-informed/mandatory-reporting/', 30, ARRAY['admin','scheduler','caregiver']::app_role[], 12),
('Infection Control & Hand Hygiene', 'CDC infection prevention guidance for in-home care.', 'Clinical', 'CDC', 'https://www.cdc.gov/infectioncontrol/guidelines/index.html', 30, ARRAY['caregiver']::app_role[], 12),
('Emergency Preparedness & Disaster Response', 'CMS emergency preparedness rule overview for home health.', 'Compliance', 'CMS', 'https://www.cms.gov/medicare/health-safety-standards/quality-safety-oversight-emergency-preparedness', 30, ARRAY['admin','scheduler','caregiver']::app_role[], 24),
('EVV & Sandata Refresher', 'Internal: clock-in/out, GPS verification, edits, and reconciliation workflow.', 'Internal', 'CareConnect', NULL, 20, ARRAY['caregiver','scheduler','admin']::app_role[], 12),
('CPR / First Aid Awareness', 'Basic life support awareness. Hands-on certification must be completed via Red Cross / AHA.', 'Clinical', 'American Red Cross', 'https://www.redcross.org/take-a-class/cpr', 120, ARRAY['caregiver']::app_role[], 24),
('Workplace Harassment & Code of Conduct', 'EEOC-aligned harassment prevention and professional conduct.', 'Compliance', 'EEOC', 'https://www.eeoc.gov/harassment', 30, ARRAY['admin','scheduler','caregiver','billing']::app_role[], 24),
('Fraud, Waste & Abuse (Medicaid)', 'Medicaid integrity training covering false claims and FWA reporting.', 'Compliance', 'CMS', 'https://www.cms.gov/medicare-medicaid-coordination/fraud-prevention/medicaid-integrity-education', 45, ARRAY['admin','billing','scheduler','caregiver']::app_role[], 12);