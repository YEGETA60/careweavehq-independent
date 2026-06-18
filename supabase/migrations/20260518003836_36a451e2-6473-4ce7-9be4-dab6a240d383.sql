
-- Tenant isolation: RESTRICTIVE policies + tightened manager SELECT policies
-- hr_document_signatures
CREATE POLICY "tenant_isolation_signatures" ON public.hr_document_signatures
AS RESTRICTIVE FOR ALL TO authenticated
USING (company_id IS NULL OR public.is_member_of_company(company_id) OR public.has_role(auth.uid(),'superadmin'))
WITH CHECK (company_id IS NULL OR public.is_member_of_company(company_id) OR public.has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "managers view all sigs" ON public.hr_document_signatures;
CREATE POLICY "managers view all sigs" ON public.hr_document_signatures
FOR SELECT TO authenticated
USING (
  public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[])
  AND company_id IS NOT NULL
  AND public.is_member_of_company(company_id)
);

DROP POLICY IF EXISTS "managers update sigs" ON public.hr_document_signatures;
CREATE POLICY "managers update sigs" ON public.hr_document_signatures
FOR UPDATE TO authenticated
USING (
  public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[])
  AND company_id IS NOT NULL
  AND public.is_member_of_company(company_id)
);

-- hr_document_audit_log
CREATE POLICY "tenant_isolation_audit" ON public.hr_document_audit_log
AS RESTRICTIVE FOR ALL TO authenticated
USING (company_id IS NULL OR public.is_member_of_company(company_id) OR public.has_role(auth.uid(),'superadmin'))
WITH CHECK (company_id IS NULL OR public.is_member_of_company(company_id) OR public.has_role(auth.uid(),'superadmin'));

DROP POLICY IF EXISTS "managers view all audit" ON public.hr_document_audit_log;
CREATE POLICY "managers view all audit" ON public.hr_document_audit_log
FOR SELECT TO authenticated
USING (
  public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[])
  AND company_id IS NOT NULL
  AND public.is_member_of_company(company_id)
);
