
UPDATE public.caregivers SET user_id = 'deea90ac-6311-4b3c-bffd-3a262ad49319' WHERE id = '1e2ce714-be65-4d93-a326-d9153f6c9502';
UPDATE public.caregivers SET user_id = '80a244b4-d132-4eb8-9ed0-d6e5ed956933' WHERE id = '4a838c5d-a1b2-4e3e-bfdb-103fe3428935';
UPDATE public.caregivers SET user_id = '041e4fa5-8746-47cb-84a7-c1ba7c3e5151' WHERE id = '8856a1e4-780f-477b-a810-aea793c4e7e3';
UPDATE public.caregivers SET user_id = 'e80da398-5a40-4201-8159-e8eaf94c695b' WHERE id = 'f06cfcb2-0124-4dc0-a2d1-5a6c7f87e91c';
UPDATE public.caregivers SET user_id = 'bcdaaed1-2a76-41a8-a806-960a5c3df9a2' WHERE id = '77c22dc1-f21c-497f-9c72-bda9bc13e61c';

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'caregiver'::app_role FROM public.caregivers
WHERE id IN ('1e2ce714-be65-4d93-a326-d9153f6c9502','4a838c5d-a1b2-4e3e-bfdb-103fe3428935','8856a1e4-780f-477b-a810-aea793c4e7e3','f06cfcb2-0124-4dc0-a2d1-5a6c7f87e91c','77c22dc1-f21c-497f-9c72-bda9bc13e61c')
ON CONFLICT DO NOTHING;

INSERT INTO public.company_users (company_id, user_id, company_role)
SELECT 'aaa9cca1-7b18-4d68-8392-23ae53246af4', user_id, 'staff'
FROM public.caregivers
WHERE id IN ('1e2ce714-be65-4d93-a326-d9153f6c9502','4a838c5d-a1b2-4e3e-bfdb-103fe3428935','8856a1e4-780f-477b-a810-aea793c4e7e3','f06cfcb2-0124-4dc0-a2d1-5a6c7f87e91c','77c22dc1-f21c-497f-9c72-bda9bc13e61c')
ON CONFLICT DO NOTHING;

INSERT INTO public.training_completions (user_id, course_id, completed_at, expires_at, company_id, notes)
SELECT
  cg.user_id,
  tc.id,
  now() - ((30 + (abs(hashtext(cg.id::text || tc.id::text)) % 240)) || ' days')::interval,
  CASE
    WHEN tc.renewal_months IS NOT NULL
      THEN now() + ((tc.renewal_months * 30 - (abs(hashtext(cg.id::text || tc.id::text)) % 360)) || ' days')::interval
    ELSE NULL
  END,
  cg.company_id,
  'Seeded demo completion'
FROM public.caregivers cg
CROSS JOIN public.training_courses tc
WHERE cg.id IN ('1e2ce714-be65-4d93-a326-d9153f6c9502','4a838c5d-a1b2-4e3e-bfdb-103fe3428935','8856a1e4-780f-477b-a810-aea793c4e7e3','f06cfcb2-0124-4dc0-a2d1-5a6c7f87e91c','77c22dc1-f21c-497f-9c72-bda9bc13e61c')
  AND tc.active = true
  AND 'caregiver' = ANY(tc.required_for_roles)
  AND (abs(hashtext(cg.id::text || tc.id::text)) % 100) > 15
ON CONFLICT DO NOTHING;

INSERT INTO public.training_assignments (course_id, user_id, due_date, company_id, notes)
SELECT
  tc.id,
  cg.user_id,
  current_date + 21,
  cg.company_id,
  'Auto-assigned outstanding training'
FROM public.caregivers cg
CROSS JOIN public.training_courses tc
WHERE cg.id IN ('1e2ce714-be65-4d93-a326-d9153f6c9502','4a838c5d-a1b2-4e3e-bfdb-103fe3428935','8856a1e4-780f-477b-a810-aea793c4e7e3','f06cfcb2-0124-4dc0-a2d1-5a6c7f87e91c','77c22dc1-f21c-497f-9c72-bda9bc13e61c')
  AND tc.active = true
  AND 'caregiver' = ANY(tc.required_for_roles)
  AND NOT EXISTS (SELECT 1 FROM public.training_completions x WHERE x.user_id = cg.user_id AND x.course_id = tc.id)
ON CONFLICT DO NOTHING;
