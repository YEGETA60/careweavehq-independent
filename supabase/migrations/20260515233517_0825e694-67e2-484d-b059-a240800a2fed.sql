
-- 1. Lock down company-logos bucket listing
-- Public CDN access via URL still works (bucket.public=true); this only blocks API listing
DROP POLICY IF EXISTS "Company logos are publicly readable" ON storage.objects;

CREATE POLICY "Company members can list logos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND public.is_member_of_company(((storage.foldername(name))[1])::uuid)
);

-- 2. Add deny-all policies for rate_limit_counters (only the SECURITY DEFINER
--    function rate_limit_check should touch it; clients have no business reading/writing)
CREATE POLICY "Deny all client access to rate_limit_counters"
ON public.rate_limit_counters FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- 3. Revoke anon EXECUTE on sensitive SECURITY DEFINER functions.
--    All these functions check auth.uid() or roles internally, but anon should
--    never be able to invoke them via PostgREST.
REVOKE EXECUTE ON FUNCTION public.list_users_with_roles() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.redeem_admin_invite(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.redeem_access_code(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.execute_data_purge(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.log_phi_access(text, text, uuid, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.auth_burndown_check() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enqueue_aggregator_visit_event(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.authorization_units_used(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.caregiver_today_visits() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.caregiver_week_hours(uuid, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_caregiver_clock_in(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_aging_buckets(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.rate_limit_check(text, integer, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.recompute_timesheet_unresolved(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.company_billed_price(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.company_active_client_count(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.company_is_read_only(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_must_have_mfa() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.effective_tier_for_company(uuid) FROM anon, public;

-- Re-grant to authenticated for ones the client legitimately calls
GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_admin_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_data_purge(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_phi_access(text, text, uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.authorization_units_used(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.caregiver_today_visits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.caregiver_week_hours(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_caregiver_clock_in(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_aging_buckets(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_billed_price(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_active_client_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_is_read_only(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_must_have_mfa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_tier_for_company(uuid) TO authenticated;
