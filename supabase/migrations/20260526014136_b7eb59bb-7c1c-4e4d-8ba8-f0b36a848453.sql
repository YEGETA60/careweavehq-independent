
-- Fix 1: Restrict exclusion_list_cache reads to company admins / superadmins
DROP POLICY IF EXISTS "Authenticated read exclusion cache" ON public.exclusion_list_cache;

CREATE POLICY "Admins read exclusion cache"
ON public.exclusion_list_cache
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 2: Prevent privilege escalation via user_roles
-- Only superadmins may grant/modify the 'superadmin' role.
DROP POLICY IF EXISTS "admin manage roles" ON public.user_roles;

CREATE POLICY "Superadmins manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins manage non-superadmin roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'superadmin'::app_role
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role <> 'superadmin'::app_role
);
