
-- Helper: trigger function that auto-sets company_id from user's current company
CREATE OR REPLACE FUNCTION public.set_company_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.current_company_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Apply the column + backfill + trigger + restrictive policy to every operational table
DO $$
DECLARE
  tbl text;
  first_company uuid;
  tables text[] := ARRAY[
    'clients','caregivers','payers','authorizations','care_plans','intakes',
    'visits','visit_series','visit_notes',
    'invoices','credentials','documents',
    'training_courses','training_assignments','training_completions',
    'employment_records','pto_balances','pto_requests',
    'disciplinary_actions','performance_reviews','onboarding_checklists',
    'notifications','messages','audit_log','evv_alerts','reminder_log','client_users'
  ];
BEGIN
  SELECT id INTO first_company FROM public.companies ORDER BY created_at LIMIT 1;

  FOREACH tbl IN ARRAY tables LOOP
    -- 1. Add column if missing
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE',
      tbl
    );

    -- 2. Backfill existing rows to first company
    IF first_company IS NOT NULL THEN
      EXECUTE format('UPDATE public.%I SET company_id = $1 WHERE company_id IS NULL', tbl)
        USING first_company;
    END IF;

    -- 3. Index for fast filtering
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (company_id)',
                   'idx_'||tbl||'_company_id', tbl);

    -- 4. Auto-set company_id trigger
    EXECUTE format('DROP TRIGGER IF EXISTS set_company_id ON public.%I', tbl);
    EXECUTE format(
      'CREATE TRIGGER set_company_id BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user()',
      tbl
    );

    -- 5. Restrictive tenant-isolation policy
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I AS RESTRICTIVE
         FOR ALL TO authenticated
         USING (
           public.has_role(auth.uid(),''superadmin'')
           OR (company_id IS NOT NULL AND public.is_member_of_company(company_id))
         )
         WITH CHECK (
           public.has_role(auth.uid(),''superadmin'')
           OR (company_id IS NOT NULL AND public.is_member_of_company(company_id))
         )',
      tbl
    );
  END LOOP;
END $$;
