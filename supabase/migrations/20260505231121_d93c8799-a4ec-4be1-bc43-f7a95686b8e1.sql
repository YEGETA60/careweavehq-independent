CREATE TABLE IF NOT EXISTS public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES public.caregivers(id) ON DELETE RESTRICT,
  care_plan_id uuid REFERENCES public.care_plans(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  evv_hours numeric(8,2) NOT NULL DEFAULT 0,
  scheduled_hours numeric(8,2) NOT NULL DEFAULT 0,
  approved_hours numeric(8,2) NOT NULL DEFAULT 0,
  variance_hours numeric(8,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft | signed | locked
  html_snapshot text,
  totals jsonb,
  storage_path text,
  locked_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timesheets_company ON public.timesheets(company_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_client ON public.timesheets(client_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_caregiver ON public.timesheets(caregiver_id);

CREATE TABLE IF NOT EXISTS public.timesheet_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('caregiver','client','supervisor')),
  signer_name text NOT NULL,
  signer_user_id uuid,
  signature_png text NOT NULL, -- data URL
  signed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  UNIQUE (timesheet_id, role)
);

ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant select timesheets" ON public.timesheets FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND (is_member_of_company(company_id) OR is_family_in_company(company_id))));
CREATE POLICY "manager insert timesheets" ON public.timesheets FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin'::app_role,'scheduler'::app_role,'supervisor'::app_role,'manager'::app_role,'operations_manager'::app_role,'billing'::app_role]) AND company_id IS NOT NULL AND is_member_of_company(company_id));
CREATE POLICY "manager update timesheets" ON public.timesheets FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin'::app_role,'scheduler'::app_role,'supervisor'::app_role,'manager'::app_role,'operations_manager'::app_role,'billing'::app_role]) AND status <> 'locked')
  WITH CHECK (status <> 'locked' OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "admin delete draft timesheets" ON public.timesheets FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) AND status = 'draft');

CREATE POLICY "tenant select sigs" ON public.timesheet_signatures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.timesheets t WHERE t.id = timesheet_id
    AND (has_role(auth.uid(),'superadmin'::app_role) OR (t.company_id IS NOT NULL AND (is_member_of_company(t.company_id) OR is_family_in_company(t.company_id))))));
CREATE POLICY "tenant insert sigs" ON public.timesheet_signatures FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.timesheets t WHERE t.id = timesheet_id
    AND t.status <> 'locked'
    AND t.company_id IS NOT NULL AND (is_member_of_company(t.company_id) OR is_family_in_company(t.company_id))));
CREATE POLICY "admin delete sigs" ON public.timesheet_signatures FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER ts_set_company BEFORE INSERT ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER ts_updated_at BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-lock timesheet once all 3 signatures present
CREATE OR REPLACE FUNCTION public.timesheet_check_locked()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  SELECT count(DISTINCT role) INTO n FROM public.timesheet_signatures WHERE timesheet_id = NEW.timesheet_id;
  IF n >= 3 THEN
    UPDATE public.timesheets SET status='signed', locked_at=now() WHERE id = NEW.timesheet_id AND status <> 'locked';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER ts_sig_lock AFTER INSERT ON public.timesheet_signatures
  FOR EACH ROW EXECUTE FUNCTION public.timesheet_check_locked();
