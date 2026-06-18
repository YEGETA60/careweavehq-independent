
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS intake_source text NOT NULL DEFAULT 'intake',
  ADD COLUMN IF NOT EXISTS external_ref text;
CREATE INDEX IF NOT EXISTS idx_clients_company_external_ref ON public.clients(company_id, external_ref);

ALTER TABLE public.caregivers
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS email text;
CREATE INDEX IF NOT EXISTS idx_caregivers_company_external_ref ON public.caregivers(company_id, external_ref);

CREATE TABLE IF NOT EXISTS public.migration_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  started_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mode text NOT NULL DEFAULT 'commit',
  status text NOT NULL DEFAULT 'running',
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
ALTER TABLE public.migration_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.migration_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.migration_runs(id) ON DELETE CASCADE,
  sheet text NOT NULL,
  external_ref text,
  entity_id uuid,
  action text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.migration_run_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_migration_run_items_run ON public.migration_run_items(run_id);

CREATE POLICY "admin view migration runs" ON public.migration_runs FOR SELECT TO authenticated
  USING (public.is_company_admin(company_id));
CREATE POLICY "admin insert migration runs" ON public.migration_runs FOR INSERT TO authenticated
  WITH CHECK (public.is_company_admin(company_id));
CREATE POLICY "admin update migration runs" ON public.migration_runs FOR UPDATE TO authenticated
  USING (public.is_company_admin(company_id));

CREATE POLICY "admin view migration items" ON public.migration_run_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.migration_runs r WHERE r.id = run_id AND public.is_company_admin(r.company_id)));
CREATE POLICY "admin insert migration items" ON public.migration_run_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.migration_runs r WHERE r.id = run_id AND public.is_company_admin(r.company_id)));
