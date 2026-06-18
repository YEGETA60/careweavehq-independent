-- Pre-bill override / admin review queue
CREATE TYPE public.prebill_override_reason AS ENUM (
  'authorization_pending',
  'rate_documented_offline',
  'credential_renewal_in_progress',
  'evv_corrected_manually',
  'payer_exception_approved',
  'one_time_admin_approval',
  'other'
);

ALTER TABLE public.billing_run_items
  ADD COLUMN IF NOT EXISTS override_reason public.prebill_override_reason,
  ADD COLUMN IF NOT EXISTS override_notes text,
  ADD COLUMN IF NOT EXISTS override_by uuid,
  ADD COLUMN IF NOT EXISTS override_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolution text; -- 'approved' | 'rejected' | 'auto'

CREATE INDEX IF NOT EXISTS idx_billing_run_items_status ON public.billing_run_items(status);
CREATE INDEX IF NOT EXISTS idx_billing_run_items_resolved ON public.billing_run_items(resolved);

-- Audit table for override actions
CREATE TABLE IF NOT EXISTS public.prebill_override_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  billing_run_item_id uuid NOT NULL REFERENCES public.billing_run_items(id) ON DELETE CASCADE,
  timesheet_id uuid,
  action text NOT NULL, -- 'approve' | 'reject' | 'rerun'
  reason public.prebill_override_reason,
  notes text,
  blockers_snapshot jsonb,
  acted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prebill_override_log_item ON public.prebill_override_log(billing_run_item_id);

ALTER TABLE public.prebill_override_log ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_prebill_override_log_company BEFORE INSERT ON public.prebill_override_log
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE POLICY tenant_isolation_prebill_override ON public.prebill_override_log AS RESTRICTIVE FOR ALL TO authenticated
  USING (company_id IS NULL OR public.is_member_of_company(company_id))
  WITH CHECK (company_id IS NULL OR public.is_member_of_company(company_id));

CREATE POLICY view_prebill_override ON public.prebill_override_log FOR SELECT TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','billing']::app_role[]));

CREATE POLICY insert_prebill_override ON public.prebill_override_log FOR INSERT TO authenticated
  WITH CHECK (
    acted_by = auth.uid()
    AND public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','billing']::app_role[])
  );