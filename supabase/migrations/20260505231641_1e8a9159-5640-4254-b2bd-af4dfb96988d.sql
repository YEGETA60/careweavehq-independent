ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS evv_reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS evv_mismatch_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evv_recon_summary jsonb,
  ADD COLUMN IF NOT EXISTS reminder_last_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.timesheet_evv_recon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  visit_date date NOT NULL,
  system_start text, system_end text, system_hours numeric(6,2),
  sandata_start text, sandata_end text, sandata_hours numeric(6,2),
  start_delta_min integer, end_delta_min integer, hours_delta numeric(6,2),
  status text NOT NULL CHECK (status IN ('matched','time_mismatch','missing_in_sandata','missing_in_system')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recon_ts ON public.timesheet_evv_recon(timesheet_id);

CREATE TABLE IF NOT EXISTS public.timesheet_signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('caregiver','client','supervisor')),
  signer_name text NOT NULL,
  signer_email text,
  signer_phone text,
  signer_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (timesheet_id, role)
);
CREATE INDEX IF NOT EXISTS idx_signers_ts ON public.timesheet_signers(timesheet_id);

CREATE TABLE IF NOT EXISTS public.timesheet_reminders_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  role text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminders_ts ON public.timesheet_reminders_log(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_reminders_recent ON public.timesheet_reminders_log(timesheet_id, sent_at DESC);

ALTER TABLE public.timesheet_evv_recon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheet_reminders_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant select recon" ON public.timesheet_evv_recon FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND (is_member_of_company(company_id) OR is_family_in_company(company_id))));
CREATE POLICY "manager write recon" ON public.timesheet_evv_recon FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin'::app_role,'scheduler'::app_role,'supervisor'::app_role,'manager'::app_role,'operations_manager'::app_role,'billing'::app_role]) AND company_id IS NOT NULL AND is_member_of_company(company_id));
CREATE POLICY "manager delete recon" ON public.timesheet_evv_recon FOR DELETE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin'::app_role,'scheduler'::app_role]));

CREATE POLICY "tenant select signers" ON public.timesheet_signers FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND (is_member_of_company(company_id) OR is_family_in_company(company_id))));
CREATE POLICY "manager write signers" ON public.timesheet_signers FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin'::app_role,'scheduler'::app_role,'supervisor'::app_role,'manager'::app_role,'operations_manager'::app_role,'billing'::app_role]) AND company_id IS NOT NULL AND is_member_of_company(company_id));
CREATE POLICY "manager update signers" ON public.timesheet_signers FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin'::app_role,'scheduler'::app_role,'supervisor'::app_role,'manager'::app_role,'operations_manager'::app_role]));
CREATE POLICY "admin delete signers" ON public.timesheet_signers FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "tenant select reminders" ON public.timesheet_reminders_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY "service insert reminders" ON public.timesheet_reminders_log FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin'::app_role,'scheduler'::app_role,'supervisor'::app_role,'manager'::app_role,'operations_manager'::app_role,'billing'::app_role]));

CREATE TRIGGER recon_set_company BEFORE INSERT ON public.timesheet_evv_recon
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER signers_set_company BEFORE INSERT ON public.timesheet_signers
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER reminders_set_company BEFORE INSERT ON public.timesheet_reminders_log
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
