
-- Billing runs (one-click auto-billing)
CREATE TABLE public.billing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | running | review | completed | failed
  total_timesheets int NOT NULL DEFAULT 0,
  generated_count int NOT NULL DEFAULT 0,
  blocked_count int NOT NULL DEFAULT 0,
  total_charge numeric NOT NULL DEFAULT 0,
  total_units numeric NOT NULL DEFAULT 0,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  exports jsonb NOT NULL DEFAULT '{}'::jsonb,
  ran_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.billing_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  billing_run_id uuid NOT NULL REFERENCES public.billing_runs(id) ON DELETE CASCADE,
  timesheet_id uuid REFERENCES public.timesheets(id) ON DELETE SET NULL,
  client_id uuid,
  caregiver_id uuid,
  status text NOT NULL DEFAULT 'pending', -- pending | blocked | generated | skipped
  reason text,
  hours numeric,
  units numeric,
  charge numeric,
  invoice_id uuid,
  claim_id uuid,
  blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dunning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  invoice_id uuid,
  claim_id uuid,
  recipient_email text,
  recipient_phone text,
  channel text NOT NULL DEFAULT 'email', -- email | sms
  age_days int,
  amount_due numeric,
  status text NOT NULL DEFAULT 'sent',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Extend invoices with auto-billing fields
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS payer_id uuid,
  ADD COLUMN IF NOT EXISTS billing_run_id uuid REFERENCES public.billing_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS timesheet_id uuid REFERENCES public.timesheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claim_id uuid,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS service_code text,
  ADD COLUMN IF NOT EXISTS units numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_date date,
  ADD COLUMN IF NOT EXISTS balance numeric,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS billing_run_id uuid REFERENCES public.billing_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS timesheet_id uuid REFERENCES public.timesheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_billing_runs_company ON public.billing_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_run_items_run ON public.billing_run_items(billing_run_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_run ON public.invoices(billing_run_id);
CREATE INDEX IF NOT EXISTS idx_invoices_timesheet ON public.invoices(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_claims_run ON public.claims(billing_run_id);
CREATE INDEX IF NOT EXISTS idx_claims_timesheet ON public.claims(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_dunning_invoice ON public.dunning_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_dunning_claim ON public.dunning_log(claim_id);

-- Auto company_id and updated_at
CREATE TRIGGER trg_billing_runs_company BEFORE INSERT ON public.billing_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_billing_runs_updated BEFORE UPDATE ON public.billing_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_billing_run_items_company BEFORE INSERT ON public.billing_run_items
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_dunning_company BEFORE INSERT ON public.dunning_log
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

ALTER TABLE public.billing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dunning_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.billing_runs AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY tenant_isolation ON public.billing_run_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));
CREATE POLICY tenant_isolation ON public.dunning_log AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));

CREATE POLICY view_billing_runs ON public.billing_runs FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY manage_billing_runs ON public.billing_runs FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY update_billing_runs ON public.billing_runs FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY delete_billing_runs ON public.billing_runs FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY view_billing_run_items ON public.billing_run_items FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY manage_billing_run_items ON public.billing_run_items FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY update_billing_run_items ON public.billing_run_items FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));

CREATE POLICY view_dunning ON public.dunning_log FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing','manager','operations_manager']::app_role[]));
CREATE POLICY insert_dunning ON public.dunning_log FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
