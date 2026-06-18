
-- 1) Helper to derive job title from a user's roles
CREATE OR REPLACE FUNCTION public._derive_job_title(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='caregiver') THEN 'Caregiver'
    WHEN EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='admin') THEN 'Administrator'
    WHEN EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='operations_manager') THEN 'Operations Manager'
    WHEN EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='manager') THEN 'Manager'
    WHEN EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='supervisor') THEN 'Supervisor'
    WHEN EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='scheduler') THEN 'Scheduler'
    WHEN EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='billing') THEN 'Billing Specialist'
    ELSE 'Staff'
  END
$$;

-- 2) Backfill: caregivers linked to a user
INSERT INTO public.employment_records (user_id, job_title, employment_type, status, hire_date)
SELECT DISTINCT c.user_id,
       'Caregiver',
       'full_time',
       'active',
       c.created_at::date
FROM public.caregivers c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.employment_records er WHERE er.user_id = c.user_id);

-- 3) Backfill: all other staff users with any non-family role
INSERT INTO public.employment_records (user_id, job_title, employment_type, status, hire_date)
SELECT DISTINCT ur.user_id,
       public._derive_job_title(ur.user_id),
       'full_time',
       'active',
       current_date
FROM public.user_roles ur
WHERE ur.role <> 'family'
  AND NOT EXISTS (SELECT 1 FROM public.employment_records er WHERE er.user_id = ur.user_id);

-- 4) Auto-create on new caregiver insert
CREATE OR REPLACE FUNCTION public.ensure_employment_record_for_caregiver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.employment_records (user_id, job_title, employment_type, status, hire_date)
    VALUES (NEW.user_id, 'Caregiver', 'full_time', 'active', COALESCE(NEW.created_at::date, current_date))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_caregiver_employment_sync ON public.caregivers;
CREATE TRIGGER trg_caregiver_employment_sync
AFTER INSERT OR UPDATE OF user_id ON public.caregivers
FOR EACH ROW EXECUTE FUNCTION public.ensure_employment_record_for_caregiver();

-- 5) Auto-create on new user_role grant (skip family)
CREATE OR REPLACE FUNCTION public.ensure_employment_record_for_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role <> 'family' THEN
    INSERT INTO public.employment_records (user_id, job_title, employment_type, status, hire_date)
    VALUES (NEW.user_id, public._derive_job_title(NEW.user_id), 'full_time', 'active', current_date)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_role_employment_sync ON public.user_roles;
CREATE TRIGGER trg_user_role_employment_sync
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.ensure_employment_record_for_role();
