
-- Helper: is the current user a family member linked to ANY client in this company?
CREATE OR REPLACE FUNCTION public.is_family_in_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_users cu
    JOIN public.clients c ON c.id = cu.client_id
    WHERE cu.user_id = auth.uid()
      AND c.company_id = _company_id
  )
$$;

-- Loosen tenant_isolation across the tables family needs to read.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['visits','visit_notes','clients','caregivers','invoices','adl_logs','assessments','care_plans','documents'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
      USING (
        has_role(auth.uid(),'superadmin'::app_role)
        OR (company_id IS NOT NULL AND (
          is_member_of_company(company_id) OR is_family_in_company(company_id)
        ))
      )
      WITH CHECK (
        has_role(auth.uid(),'superadmin'::app_role)
        OR (company_id IS NOT NULL AND is_member_of_company(company_id))
      )
    $p$, t);
  END LOOP;
END $$;

-- Family permissive SELECT policies
CREATE POLICY "family view visits" ON public.visits
  FOR SELECT TO authenticated
  USING (is_family_of_client(client_id));

CREATE POLICY "family view visit notes" ON public.visit_notes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.visits v WHERE v.id = visit_notes.visit_id AND is_family_of_client(v.client_id)));

CREATE POLICY "family view caregivers" ON public.caregivers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.visits v
    WHERE v.caregiver_id = caregivers.id AND is_family_of_client(v.client_id)
  ));

-- Realtime
ALTER TABLE public.visits REPLICA IDENTITY FULL;
ALTER TABLE public.visit_notes REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_notes;
