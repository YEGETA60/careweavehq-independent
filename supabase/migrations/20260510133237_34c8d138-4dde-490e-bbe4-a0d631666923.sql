
-- 1) Remove overly broad SELECT on documents bucket
DROP POLICY IF EXISTS "auth read documents" ON storage.objects;

-- 2) Restrict telephony_phone_registry SELECT to admin/manager roles only
DROP POLICY IF EXISTS telreg_select ON public.telephony_phone_registry;
CREATE POLICY telreg_select ON public.telephony_phone_registry
  FOR SELECT TO authenticated
  USING (
    is_company_admin(company_id)
    OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[])
       AND is_member_of_company(company_id)
  );

-- 3) Add explicit write policies on evv_alerts (admin/scheduler only)
CREATE POLICY "admin write evv alerts" ON public.evv_alerts
  FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
              AND (company_id IS NULL OR is_member_of_company(company_id)));

CREATE POLICY "admin update evv alerts" ON public.evv_alerts
  FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
         AND (company_id IS NULL OR is_member_of_company(company_id)))
  WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
              AND (company_id IS NULL OR is_member_of_company(company_id)));

CREATE POLICY "admin delete evv alerts" ON public.evv_alerts
  FOR DELETE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin']::app_role[])
         AND (company_id IS NULL OR is_member_of_company(company_id)));

-- 4) Lock down realtime.messages: app uses postgres_changes (which bypass this table).
-- Default-deny any direct broadcast/presence subscriptions until explicitly enabled.
DO $$
BEGIN
  EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN others THEN NULL;
END $$;

DROP POLICY IF EXISTS "deny all realtime messages" ON realtime.messages;
CREATE POLICY "deny all realtime messages" ON realtime.messages
  FOR SELECT TO authenticated
  USING (false);
