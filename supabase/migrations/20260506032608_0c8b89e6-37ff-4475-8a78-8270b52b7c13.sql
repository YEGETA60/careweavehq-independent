-- 1) Bind admin user to demo company
UPDATE public.profiles
SET default_company_id = 'aaa9cca1-7b18-4d68-8392-23ae53246af4',
    onboarding_completed = true
WHERE id = 'e07cafd8-5ce4-4e5c-936a-2b63802e1ed1';

-- 2) Fix infinite recursion: visits <-> caregivers cross-references
-- Use SECURITY DEFINER helpers that bypass RLS within the policy expression.

CREATE OR REPLACE FUNCTION public.is_caregiver_for_visit(_visit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.visits v
    JOIN public.caregivers c ON c.id = v.caregiver_id
    WHERE v.id = _visit_id AND c.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_visit_caregiver(_caregiver_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT user_id FROM public.caregivers WHERE id = _caregiver_id) = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_family_of_visit(_visit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.visits v
    JOIN public.client_users cu ON cu.client_id = v.client_id
    WHERE v.id = _visit_id AND cu.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_family_of_caregiver(_caregiver_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.visits v
    JOIN public.client_users cu ON cu.client_id = v.client_id
    WHERE v.caregiver_id = _caregiver_id AND cu.user_id = auth.uid()
  )
$$;

-- Recreate visits policies without subquerying caregivers directly
DROP POLICY IF EXISTS "staff view visits" ON public.visits;
CREATE POLICY "staff view visits" ON public.visits
FOR SELECT TO authenticated
USING (
  current_user_has_any_role(ARRAY['admin'::app_role, 'scheduler'::app_role, 'billing'::app_role])
  OR public.is_visit_caregiver(caregiver_id)
);

DROP POLICY IF EXISTS "update visits" ON public.visits;
CREATE POLICY "update visits" ON public.visits
FOR UPDATE TO authenticated
USING (
  current_user_has_any_role(ARRAY['admin'::app_role, 'scheduler'::app_role])
  OR public.is_visit_caregiver(caregiver_id)
);

-- Recreate caregivers family policy without subquerying visits directly
DROP POLICY IF EXISTS "family view caregivers" ON public.caregivers;
CREATE POLICY "family view caregivers" ON public.caregivers
FOR SELECT TO authenticated
USING (public.is_family_of_caregiver(id));