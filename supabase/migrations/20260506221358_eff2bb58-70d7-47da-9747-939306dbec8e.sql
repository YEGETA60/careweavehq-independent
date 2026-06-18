-- Restrictive policies: block writes when company is read-only.
-- Restrictive policies AND with existing permissive ones, so they only further constrain.

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'clients','caregivers','visits','care_plans','visit_notes',
    'authorizations','timesheets','invoices','claims','payers',
    'credentials','documents','messages'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "block writes when read only" ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY "block writes when read only"
      ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (
        company_id IS NULL
        OR NOT public.company_is_read_only(company_id)
        OR public.has_role(auth.uid(), 'superadmin')
      )
      WITH CHECK (
        company_id IS NULL
        OR NOT public.company_is_read_only(company_id)
        OR public.has_role(auth.uid(), 'superadmin')
      )
    $f$, t);
  END LOOP;
END $$;