
-- 1) Restrict aggregator_connections SELECT to admin/billing/operations_manager
DROP POLICY IF EXISTS "agg_conn_select" ON public.aggregator_connections;
CREATE POLICY "agg_conn_select" ON public.aggregator_connections
  FOR SELECT TO authenticated
  USING (
    is_member_of_company(company_id)
    AND (
      is_company_admin(company_id)
      OR current_user_has_any_role(ARRAY['admin','billing','operations_manager']::app_role[])
    )
  );

-- 2) Restrict aggregator_inbound_events SELECT to admin/billing/operations_manager
DROP POLICY IF EXISTS "agg_in_select" ON public.aggregator_inbound_events;
CREATE POLICY "agg_in_select" ON public.aggregator_inbound_events
  FOR SELECT TO authenticated
  USING (
    is_member_of_company(company_id)
    AND (
      is_company_admin(company_id)
      OR current_user_has_any_role(ARRAY['admin','billing','operations_manager']::app_role[])
    )
  );

-- 3) Restrict telephony_phone_registry SELECT to company admins only (pin_hash exposure)
DROP POLICY IF EXISTS "telreg_select" ON public.telephony_phone_registry;
CREATE POLICY "telreg_select" ON public.telephony_phone_registry
  FOR SELECT TO authenticated
  USING (is_company_admin(company_id));

-- 4) Restrict eligibility_checks SELECT to billing/admin/scheduler/manager/operations_manager
DROP POLICY IF EXISTS "elig_select" ON public.eligibility_checks;
CREATE POLICY "elig_select" ON public.eligibility_checks
  FOR SELECT TO authenticated
  USING (
    is_member_of_company(company_id)
    AND current_user_has_any_role(ARRAY['admin','billing','scheduler','manager','operations_manager']::app_role[])
  );

-- 5) Scope admin role-management to same company (prevent cross-tenant escalation)
DROP POLICY IF EXISTS "Admins manage non-superadmin roles" ON public.user_roles;
CREATE POLICY "Admins manage non-superadmin roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'superadmin'::app_role
    AND EXISTS (
      SELECT 1 FROM public.company_users cu_target
      JOIN public.company_users cu_admin
        ON cu_admin.company_id = cu_target.company_id
       AND cu_admin.user_id = auth.uid()
       AND cu_admin.company_role IN ('owner','admin')
      WHERE cu_target.user_id = user_roles.user_id
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'superadmin'::app_role
    AND EXISTS (
      SELECT 1 FROM public.company_users cu_target
      JOIN public.company_users cu_admin
        ON cu_admin.company_id = cu_target.company_id
       AND cu_admin.user_id = auth.uid()
       AND cu_admin.company_role IN ('owner','admin')
      WHERE cu_target.user_id = user_roles.user_id
    )
  );

-- 6) Fix the self-insert guard bug on company_users
DROP POLICY IF EXISTS "company admin manages members ins" ON public.company_users;
CREATE POLICY "company admin manages members ins" ON public.company_users
  FOR INSERT TO authenticated
  WITH CHECK (
    is_company_admin(company_id)
    OR (
      user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.company_users cu2
        WHERE cu2.company_id = company_users.company_id
          AND cu2.user_id = auth.uid()
      )
    )
  );

-- 7) Storage: require ownership check when staff updates documents bucket
DROP POLICY IF EXISTS "staff update docs storage" ON storage.objects;
CREATE POLICY "staff update docs storage" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
    AND public.is_member_of_company(
      (SELECT company_id FROM public.documents WHERE storage_path = storage.objects.name LIMIT 1)
    )
  );
