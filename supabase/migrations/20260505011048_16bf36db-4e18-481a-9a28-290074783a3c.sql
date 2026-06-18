
-- 1. Fix broken caregiver storage policies
DROP POLICY IF EXISTS "caregiver read own docs" ON storage.objects;
DROP POLICY IF EXISTS "caregiver upload own docs" ON storage.objects;

CREATE POLICY "caregiver read own docs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'caregivers'
  AND EXISTS (
    SELECT 1 FROM public.caregivers c
    WHERE c.user_id = auth.uid()
      AND (storage.foldername(name))[2] = c.id::text
  )
);

CREATE POLICY "caregiver upload own docs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'caregivers'
  AND EXISTS (
    SELECT 1 FROM public.caregivers c
    WHERE c.user_id = auth.uid()
      AND (storage.foldername(name))[2] = c.id::text
  )
);

-- 2. Role-check the authorization_units_used RPC
CREATE OR REPLACE FUNCTION public.authorization_units_used(_auth_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN (
    SELECT coalesce(sum(
      CASE
        WHEN v.verification_status IN ('Verified','Manual-Override') AND v.status = 'Completed'
        THEN extract(epoch FROM (
          ('1970-01-01 ' || coalesce(v.verified_end_time, v.end_time))::timestamp
          - ('1970-01-01 ' || coalesce(v.verified_start_time, v.start_time))::timestamp
        )) / 60.0 / nullif((SELECT unit_minutes FROM public.authorizations WHERE id = _auth_id), 0)
        ELSE 0
      END
    ), 0)
    FROM public.visits v
    WHERE v.authorization_id = _auth_id
  );
END;
$$;

-- 3. Visit notes: enforce author_id ownership
DROP POLICY IF EXISTS "insert visit notes" ON public.visit_notes;
CREATE POLICY "insert visit notes" ON public.visit_notes
FOR INSERT TO authenticated
WITH CHECK (
  (author_id IS NULL OR author_id = auth.uid())
  AND (
    current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
    OR EXISTS (
      SELECT 1 FROM public.visits v
      JOIN public.caregivers c ON c.id = v.caregiver_id
      WHERE v.id = visit_notes.visit_id AND c.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "update visit notes" ON public.visit_notes;
CREATE POLICY "update visit notes" ON public.visit_notes
FOR UPDATE TO authenticated
USING (
  current_user_has_any_role(ARRAY['admin','scheduler']::app_role[])
  OR author_id = auth.uid()
)
WITH CHECK (
  (author_id IS NULL OR author_id = auth.uid()
   OR current_user_has_any_role(ARRAY['admin']::app_role[]))
);

-- 4. Audit log: restrict action to allowlist
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_action_allowlist
  CHECK (action IN (
    'create','update','delete',
    'grant_role','revoke_role',
    'clock_in','clock_out',
    'login','logout',
    'view','export','print'
  ));

-- 5. Notifications: only staff can create
DROP POLICY IF EXISTS "admin insert notif" ON public.notifications;
CREATE POLICY "staff insert notif" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[])
);

-- 6. Revoke EXECUTE from anon on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.authorization_units_used(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_users_with_roles() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_user_has_any_role(public.app_role[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_family_of_client(uuid) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.authorization_units_used(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_any_role(public.app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_of_client(uuid) TO authenticated;
