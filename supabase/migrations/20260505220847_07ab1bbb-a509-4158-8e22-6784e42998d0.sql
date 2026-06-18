
-- 1) Audit log: constrain action to allowlist on INSERT
DROP POLICY IF EXISTS "auth insert audit" ON public.audit_log;
CREATE POLICY "auth insert audit"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND action IN (
    'login','logout','create','read','update','delete',
    'export','print','sign','approve','reject','submit',
    'clock_in','clock_out','verify','override','invite','revoke'
  )
);

-- 2) Fix caregiver storage policies (compare path of object name, not caregiver display name)
DROP POLICY IF EXISTS "caregiver read own docs" ON storage.objects;
CREATE POLICY "caregiver read own docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'caregivers'
  AND EXISTS (
    SELECT 1 FROM public.caregivers c
    WHERE c.user_id = auth.uid()
      AND (storage.foldername(name))[2] = (c.id)::text
  )
);

DROP POLICY IF EXISTS "caregiver upload own docs" ON storage.objects;
CREATE POLICY "caregiver upload own docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'caregivers'
  AND EXISTS (
    SELECT 1 FROM public.caregivers c
    WHERE c.user_id = auth.uid()
      AND (storage.foldername(name))[2] = (c.id)::text
  )
);

-- 3) Profiles: allow each user to insert their own profile
DROP POLICY IF EXISTS "users insert own profile" ON public.profiles;
CREATE POLICY "users insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- 4) Lock search_path on functions that don't have it set
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.bootstrap_first_admin() SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
