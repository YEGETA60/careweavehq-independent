
-- 1) Caregivers: drop family direct SELECT (wage/NPI/license/email/phone exposure)
DROP POLICY IF EXISTS "family view caregivers" ON public.caregivers;

-- 2) Companies: protect tax_id and edi_submitter_id via column grants + secdef accessor
REVOKE SELECT (tax_id, edi_submitter_id) ON public.companies FROM authenticated;
REVOKE SELECT (tax_id, edi_submitter_id) ON public.companies FROM anon;
GRANT  SELECT (tax_id, edi_submitter_id) ON public.companies TO service_role;

CREATE OR REPLACE FUNCTION public.get_company_billing_identity(_company_id uuid)
RETURNS TABLE (tax_id text, edi_submitter_id text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'superadmin')
    OR public.has_role(auth.uid(), 'admin')
    OR (public.is_company_admin(_company_id))
    OR (public.is_member_of_company(_company_id)
        AND public.current_user_has_any_role(ARRAY['billing','admin']::app_role[]))
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT c.tax_id, c.edi_submitter_id
    FROM public.companies c
    WHERE c.id = _company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_company_billing_identity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_company_billing_identity(uuid) TO authenticated, service_role;

-- 3) Timesheet signers: restrict SELECT to staff (drop family access)
DROP POLICY IF EXISTS "tenant select signers" ON public.timesheet_signers;
CREATE POLICY "staff select signers"
  ON public.timesheet_signers
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin')
    OR (
      company_id IS NOT NULL
      AND public.is_member_of_company(company_id)
      AND public.current_user_has_any_role(
        ARRAY['admin','scheduler','supervisor','manager','operations_manager','billing']::app_role[]
      )
    )
  );

-- 4) Messages: drop the no-op "deny all realtime" permissive policy
DROP POLICY IF EXISTS "deny all realtime messages" ON public.messages;

-- 5) Storage: enforce tenant isolation on document uploads
DROP POLICY IF EXISTS "staff write docs storage" ON storage.objects;
CREATE POLICY "staff write docs storage"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND public.current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[])
    AND (
      -- clients/<client_id>/...
      (
        (storage.foldername(name))[1] = 'clients'
        AND EXISTS (
          SELECT 1 FROM public.clients cl
          WHERE cl.id = ((storage.foldername(name))[2])::uuid
            AND public.is_member_of_company(cl.company_id)
        )
      )
      OR
      -- caregivers/<caregiver_id>/...
      (
        (storage.foldername(name))[1] = 'caregivers'
        AND EXISTS (
          SELECT 1 FROM public.caregivers cg
          WHERE cg.id = ((storage.foldername(name))[2])::uuid
            AND public.is_member_of_company(cg.company_id)
        )
      )
      OR
      -- companies/<company_id>/... (logos, etc.)
      (
        (storage.foldername(name))[1] = 'companies'
        AND public.is_member_of_company(((storage.foldername(name))[2])::uuid)
      )
    )
  );
