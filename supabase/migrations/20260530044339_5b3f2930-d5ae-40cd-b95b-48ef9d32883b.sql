
-- 1) company_users bootstrap + tighten INSERT
CREATE OR REPLACE FUNCTION public.bootstrap_company_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.company_users (company_id, user_id, company_role)
    VALUES (NEW.id, NEW.created_by, 'owner') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_bootstrap_owner ON public.companies;
CREATE TRIGGER companies_bootstrap_owner
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.bootstrap_company_owner();

DROP POLICY IF EXISTS "company admin manages members ins" ON public.company_users;
CREATE POLICY "company admin manages members ins" ON public.company_users
  FOR INSERT TO authenticated
  WITH CHECK (is_company_admin(company_id));

-- 2) aggregator_connections SELECT: admins only
DROP POLICY IF EXISTS "agg_conn_select" ON public.aggregator_connections;
CREATE POLICY "agg_conn_select" ON public.aggregator_connections
  FOR SELECT TO authenticated
  USING (
    is_member_of_company(company_id)
    AND (is_company_admin(company_id) OR current_user_has_any_role(ARRAY['admin']::app_role[]))
  );

-- 3) aggregator_inbound_events SELECT: admins only
DROP POLICY IF EXISTS "agg_in_select" ON public.aggregator_inbound_events;
CREATE POLICY "agg_in_select" ON public.aggregator_inbound_events
  FOR SELECT TO authenticated
  USING (
    is_member_of_company(company_id)
    AND (is_company_admin(company_id) OR current_user_has_any_role(ARRAY['admin']::app_role[]))
  );

-- 4) eligibility_checks: exclude raw_271 from non-admin column access
REVOKE SELECT ON public.eligibility_checks FROM authenticated;
GRANT SELECT
  (id, company_id, client_id, payer_id, service_date, service_type, status,
   is_active, member_id, group_number, plan_name, coverage_start, coverage_end,
   copay_amount, deductible_remaining, oop_remaining, error_message,
   provider, checked_by, checked_at)
  ON public.eligibility_checks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.eligibility_checks TO authenticated;
GRANT ALL ON public.eligibility_checks TO service_role;

-- 5) telephony_phone_registry: exclude pin_hash
REVOKE SELECT ON public.telephony_phone_registry FROM authenticated;
GRANT SELECT
  (id, company_id, caregiver_id, phone_e164, active, created_at)
  ON public.telephony_phone_registry TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.telephony_phone_registry TO authenticated;
GRANT ALL ON public.telephony_phone_registry TO service_role;

-- 6) contact_messages: admin DELETE
DROP POLICY IF EXISTS "Admins can delete contact messages" ON public.contact_messages;
CREATE POLICY "Admins can delete contact messages" ON public.contact_messages
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7) evv_alerts SELECT: admin only
DROP POLICY IF EXISTS "admin view evv alerts" ON public.evv_alerts;
CREATE POLICY "admin view evv alerts" ON public.evv_alerts
  FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin']::app_role[]));

-- 8) reminder_log SELECT: admin only
DROP POLICY IF EXISTS "admin view reminder log" ON public.reminder_log;
CREATE POLICY "admin view reminder log" ON public.reminder_log
  FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin']::app_role[]));

-- 9) dunning_log SELECT: admin + billing only
DROP POLICY IF EXISTS "view_dunning" ON public.dunning_log;
CREATE POLICY "view_dunning" ON public.dunning_log
  FOR SELECT TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
