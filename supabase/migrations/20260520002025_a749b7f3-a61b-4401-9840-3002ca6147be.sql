
-- Restrictive tenant isolation: enforces company membership regardless of role
CREATE POLICY "tenant_isolation_hr_audit"
ON public.hr_document_audit_log
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (company_id IS NOT NULL AND public.is_member_of_company(company_id))
WITH CHECK (company_id IS NOT NULL AND public.is_member_of_company(company_id));

CREATE POLICY "tenant_isolation_hr_sigs"
ON public.hr_document_signatures
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (company_id IS NOT NULL AND public.is_member_of_company(company_id))
WITH CHECK (company_id IS NOT NULL AND public.is_member_of_company(company_id));
