
-- Restore broad SELECT policy (admin/billing/operations_manager + company admin)
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

-- Column-level grants: hide credential columns from all authenticated users
REVOKE SELECT ON public.aggregator_connections FROM authenticated;
GRANT SELECT
  (id, company_id, vendor, state, environment, agency_id, provider_id,
   api_base_url, status, last_handshake_at, last_error, config,
   created_at, updated_at)
  ON public.aggregator_connections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.aggregator_connections TO authenticated;
GRANT ALL ON public.aggregator_connections TO service_role;

-- Admin-only deliberate read of credential columns
CREATE OR REPLACE FUNCTION public.get_aggregator_connection_credentials(_id uuid)
RETURNS TABLE (
  sftp_host text,
  sftp_user text,
  api_key_secret_ref text,
  sftp_key_secret_ref text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _company uuid;
BEGIN
  SELECT company_id INTO _company FROM public.aggregator_connections WHERE id = _id;
  IF _company IS NULL THEN
    RAISE EXCEPTION 'Connection not found';
  END IF;
  IF NOT public.is_company_admin(_company) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT c.sftp_host, c.sftp_user, c.api_key_secret_ref, c.sftp_key_secret_ref
    FROM public.aggregator_connections c
    WHERE c.id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_aggregator_connection_credentials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_aggregator_connection_credentials(uuid) TO authenticated;
