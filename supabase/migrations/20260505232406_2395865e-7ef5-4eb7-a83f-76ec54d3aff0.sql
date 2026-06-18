-- Reason codes for EVV overrides
DO $$ BEGIN
  CREATE TYPE public.evv_override_reason AS ENUM (
    'caregiver_forgot_clockout',
    'caregiver_forgot_clockin',
    'phone_or_app_issue',
    'sandata_outage',
    'manual_visit_approved',
    'documentation_correction',
    'tolerance_acceptable',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sandata batch (one CSV upload per pay period / payer)
CREATE TABLE IF NOT EXISTS public.sandata_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  label text,
  period_start date NOT NULL,
  period_end date NOT NULL,
  program_type text,
  payer text,
  filename text,
  row_count integer NOT NULL DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
CREATE INDEX IF NOT EXISTS idx_sandata_batches_company_period ON public.sandata_batches(company_id, period_start, period_end);

ALTER TABLE public.sandata_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office reads sandata batches in company"
ON public.sandata_batches FOR SELECT TO authenticated
USING (public.is_member_of_company(company_id) AND public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','scheduler','billing']::app_role[]));

CREATE POLICY "office inserts sandata batches in company"
ON public.sandata_batches FOR INSERT TO authenticated
WITH CHECK (public.is_member_of_company(company_id) AND public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','scheduler','billing']::app_role[]));

CREATE POLICY "office updates sandata batches in company"
ON public.sandata_batches FOR UPDATE TO authenticated
USING (public.is_member_of_company(company_id) AND public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','billing']::app_role[]));

CREATE POLICY "office deletes sandata batches in company"
ON public.sandata_batches FOR DELETE TO authenticated
USING (public.is_member_of_company(company_id) AND public.current_user_has_any_role(ARRAY['admin','manager','operations_manager']::app_role[]));

-- Parsed visit rows from Sandata
CREATE TABLE IF NOT EXISTS public.sandata_visit_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.sandata_batches(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  caregiver_id uuid REFERENCES public.caregivers(id) ON DELETE SET NULL,
  client_external_id text,
  medicaid_id text,
  client_name text,
  caregiver_name text,
  program_type text,
  payer text,
  service_code text,
  visit_date date NOT NULL,
  start_time text,
  end_time text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sandata_rows_batch ON public.sandata_visit_rows(batch_id);
CREATE INDEX IF NOT EXISTS idx_sandata_rows_lookup
  ON public.sandata_visit_rows(company_id, client_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_sandata_rows_external
  ON public.sandata_visit_rows(company_id, client_external_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_sandata_rows_medicaid
  ON public.sandata_visit_rows(company_id, medicaid_id, visit_date);

ALTER TABLE public.sandata_visit_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "office reads sandata rows in company"
ON public.sandata_visit_rows FOR SELECT TO authenticated
USING (public.is_member_of_company(company_id) AND public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','scheduler','billing']::app_role[]));

CREATE POLICY "office inserts sandata rows in company"
ON public.sandata_visit_rows FOR INSERT TO authenticated
WITH CHECK (public.is_member_of_company(company_id) AND public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','scheduler','billing']::app_role[]));

CREATE POLICY "office deletes sandata rows in company"
ON public.sandata_visit_rows FOR DELETE TO authenticated
USING (public.is_member_of_company(company_id) AND public.current_user_has_any_role(ARRAY['admin','manager','operations_manager']::app_role[]));

-- Override columns on recon rows
ALTER TABLE public.timesheet_evv_recon
  ADD COLUMN IF NOT EXISTS override_reason public.evv_override_reason,
  ADD COLUMN IF NOT EXISTS override_notes text,
  ADD COLUMN IF NOT EXISTS override_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS override_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false;

-- Unresolved counter on timesheets
ALTER TABLE public.timesheets
  ADD COLUMN IF NOT EXISTS evv_unresolved_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evv_batch_ids uuid[] DEFAULT '{}'::uuid[];

-- Allow officers to UPDATE recon rows (override). Read RLS exists already on table.
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "office overrides recon" ON public.timesheet_evv_recon FOR UPDATE TO authenticated USING (public.current_user_has_any_role(ARRAY[''admin'',''manager'',''operations_manager'',''supervisor'',''billing'']::app_role[])) WITH CHECK (public.current_user_has_any_role(ARRAY[''admin'',''manager'',''operations_manager'',''supervisor'',''billing'']::app_role[]))';
EXCEPTION WHEN duplicate_object THEN NULL;
WHEN others THEN NULL; END $$;

-- Helper to recompute unresolved count
CREATE OR REPLACE FUNCTION public.recompute_timesheet_unresolved(_ts uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c integer;
BEGIN
  SELECT count(*) INTO c FROM public.timesheet_evv_recon
   WHERE timesheet_id = _ts AND status <> 'matched' AND coalesce(resolved,false) = false;
  UPDATE public.timesheets SET evv_unresolved_count = c WHERE id = _ts;
  RETURN c;
END $$;