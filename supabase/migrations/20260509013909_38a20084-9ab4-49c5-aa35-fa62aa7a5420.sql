DROP VIEW IF EXISTS public.unsigned_care_plans_30d;
CREATE VIEW public.unsigned_care_plans_30d
WITH (security_invoker = true) AS
SELECT cp.id AS care_plan_id, cp.client_id, cp.company_id, c.name AS client_name,
       cp.created_at, cpv.physician_signed_at,
       (current_date - cp.created_at::date) AS days_since_created
FROM public.care_plans cp
JOIN public.clients c ON c.id = cp.client_id
LEFT JOIN public.care_plan_versions cpv ON cpv.id = cp.current_version_id
WHERE (cpv.physician_signed_at IS NULL)
  AND (current_date - cp.created_at::date) >= 30
  AND cp.active = true;