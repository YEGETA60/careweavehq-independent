
-- Client geofence + coords
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS geofence_meters int NOT NULL DEFAULT 150;

-- Visit skill/cert requirements
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS skills_required text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certifications_required text[] DEFAULT '{}';

-- Caregiver weekly availability
CREATE TABLE public.caregiver_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time text NOT NULL,
  end_time text NOT NULL,
  max_hours_per_week numeric,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.caregiver_availability ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_avail_caregiver ON public.caregiver_availability(caregiver_id);
CREATE TRIGGER trg_avail_company BEFORE INSERT ON public.caregiver_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_avail_updated BEFORE UPDATE ON public.caregiver_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY tenant_isolation ON public.caregiver_availability AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY view_avail ON public.caregiver_availability FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler','manager','operations_manager','supervisor']::app_role[])
    OR EXISTS(SELECT 1 FROM caregivers c WHERE c.id=caregiver_availability.caregiver_id AND c.user_id=auth.uid()));
CREATE POLICY insert_avail ON public.caregiver_availability FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
    OR EXISTS(SELECT 1 FROM caregivers c WHERE c.id=caregiver_availability.caregiver_id AND c.user_id=auth.uid()));
CREATE POLICY update_avail ON public.caregiver_availability FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
    OR EXISTS(SELECT 1 FROM caregivers c WHERE c.id=caregiver_availability.caregiver_id AND c.user_id=auth.uid()));
CREATE POLICY delete_avail ON public.caregiver_availability FOR DELETE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
    OR EXISTS(SELECT 1 FROM caregivers c WHERE c.id=caregiver_availability.caregiver_id AND c.user_id=auth.uid()));

-- Open shifts marketplace
CREATE TABLE public.open_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  skills_required text[] DEFAULT '{}',
  certifications_required text[] DEFAULT '{}',
  hourly_rate numeric,
  notes text,
  status text NOT NULL DEFAULT 'open', -- open|claimed|approved|cancelled|filled
  claimed_by uuid, -- caregiver_id
  claimed_at timestamptz,
  approved_by uuid, -- user_id
  approved_at timestamptz,
  visit_id uuid, -- set when filled
  posted_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.open_shifts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_open_shifts_status ON public.open_shifts(status);
CREATE INDEX idx_open_shifts_date ON public.open_shifts(date);
CREATE TRIGGER trg_open_shifts_company BEFORE INSERT ON public.open_shifts
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_open_shifts_updated BEFORE UPDATE ON public.open_shifts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY tenant_isolation ON public.open_shifts AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY view_open_shifts ON public.open_shifts FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL); -- any tenant member can see open shifts
CREATE POLICY insert_open_shifts ON public.open_shifts FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY update_open_shifts ON public.open_shifts FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler','manager','operations_manager','supervisor']::app_role[])
    OR (status = 'open' AND EXISTS(SELECT 1 FROM caregivers c WHERE c.user_id = auth.uid()))
    OR (status = 'claimed' AND EXISTS(SELECT 1 FROM caregivers c WHERE c.id=open_shifts.claimed_by AND c.user_id=auth.uid())));
CREATE POLICY delete_open_shifts ON public.open_shifts FOR DELETE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));

-- OT forecast helper (verified hours per caregiver per ISO week)
CREATE OR REPLACE FUNCTION public.caregiver_week_hours(_caregiver uuid, _week_start date)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (
      ('1970-01-01 ' || COALESCE(verified_end_time, end_time))::timestamp
      - ('1970-01-01 ' || COALESCE(verified_start_time, start_time))::timestamp
    )) / 3600.0
  ), 0)::numeric
  FROM public.visits
  WHERE caregiver_id = _caregiver
    AND date >= _week_start
    AND date < _week_start + 7;
$$;

-- Skill match helper
CREATE OR REPLACE FUNCTION public.caregiver_matches(_caregiver uuid, _skills text[], _certs text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (_skills IS NULL OR _skills = '{}' OR EXISTS(
      SELECT 1 FROM caregivers c WHERE c.id = _caregiver AND c.skills @> _skills))
    AND
    (_certs IS NULL OR _certs = '{}' OR EXISTS(
      SELECT 1 FROM caregivers c WHERE c.id = _caregiver AND c.certifications @> _certs));
$$;
