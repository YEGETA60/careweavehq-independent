
-- 1) aggregator_outbound_events: restrict SELECT to admin/billing/operations
DROP POLICY IF EXISTS agg_out_select ON public.aggregator_outbound_events;
CREATE POLICY agg_out_select ON public.aggregator_outbound_events
  FOR SELECT TO authenticated
  USING (is_member_of_company(company_id)
         AND current_user_has_any_role(ARRAY['admin','billing','operations_manager']::app_role[]));

-- 2) telephony_clock_events: restrict SELECT to admin/operations
DROP POLICY IF EXISTS tel_evt_select ON public.telephony_clock_events;
CREATE POLICY tel_evt_select ON public.telephony_clock_events
  FOR SELECT TO authenticated
  USING (is_member_of_company(company_id)
         AND current_user_has_any_role(ARRAY['admin','operations_manager']::app_role[]));

-- 3) timesheet_reminders_log: restrict SELECT to admin/billing/manager roles
DROP POLICY IF EXISTS "tenant select reminders" ON public.timesheet_reminders_log;
CREATE POLICY "tenant select reminders" ON public.timesheet_reminders_log
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR (
      company_id IS NOT NULL
      AND is_member_of_company(company_id)
      AND current_user_has_any_role(ARRAY['admin','billing','manager','operations_manager']::app_role[])
    )
  );

-- 4) phi_audit_logs: tenant isolation (superadmin sees all, admins only their tenant)
DROP POLICY IF EXISTS "admin read phi audit" ON public.phi_audit_logs;
CREATE POLICY "admin read phi audit" ON public.phi_audit_logs
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR (
      has_role(auth.uid(), 'admin'::app_role)
      AND company_id IS NOT NULL
      AND is_member_of_company(company_id)
    )
  );

-- 5) profiles: cross-tenant admin reads only for superadmin; tenant admins
--    see profiles of users in their own companies; users still see themselves.
DROP POLICY IF EXISTS "view own or admin" ON public.profiles;
CREATE POLICY "view own or admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR has_role(auth.uid(), 'superadmin'::app_role)
    OR (
      has_role(auth.uid(), 'admin'::app_role)
      AND EXISTS (
        SELECT 1
        FROM public.company_users me
        JOIN public.company_users them ON them.company_id = me.company_id
        WHERE me.user_id = auth.uid()
          AND them.user_id = profiles.id
      )
    )
  );

DROP POLICY IF EXISTS "admin update profiles" ON public.profiles;
CREATE POLICY "admin update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR (
      has_role(auth.uid(), 'admin'::app_role)
      AND EXISTS (
        SELECT 1
        FROM public.company_users me
        JOIN public.company_users them ON them.company_id = me.company_id
        WHERE me.user_id = auth.uid()
          AND them.user_id = profiles.id
      )
    )
  );

-- 6) storage.objects: tighten UPDATE policy on company-logos bucket to require
--    company admin of the owning folder (matches INSERT/DELETE policies).
DROP POLICY IF EXISTS "company-logos update restricted" ON storage.objects;
CREATE POLICY "company-logos update restricted" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND is_company_admin(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND is_company_admin(((storage.foldername(name))[1])::uuid)
    AND lower(COALESCE(metadata->>'mimetype','')) = ANY (ARRAY['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml'])
    AND COALESCE((metadata->>'size')::bigint, 0::bigint) <= 2097152
  );

-- 7) learning_quizzes: hide the answer key from authenticated clients via
--    column-level privileges. Server-side grading edge function uses the
--    service role and is unaffected.
REVOKE SELECT ON public.learning_quizzes FROM authenticated;
GRANT SELECT (id, lesson_id, course_id, question, options, explanation, sort_order, created_at)
  ON public.learning_quizzes TO authenticated;
