-- Restore CareWeaveHQ owner access after moving off Lovable.
--
-- The independent Supabase project starts with a clean auth database, so the
-- historical Lovable owner/admin roles do not automatically follow the app.
-- These known owner emails should always receive full superadmin/admin access
-- when present in auth.users, and future signups with these emails should get
-- the same roles immediately.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.phone)
  ON CONFLICT (id) DO NOTHING;

  IF lower(COALESCE(NEW.email, '')) IN ('yeyesus@gmail.com', 'yohanneskhm@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES
      (NEW.id, 'admin'::public.app_role),
      (NEW.id, 'superadmin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, r.role::public.app_role
FROM auth.users u
CROSS JOIN (VALUES ('admin'), ('superadmin')) AS r(role)
WHERE lower(COALESCE(u.email, '')) IN ('yeyesus@gmail.com', 'yohanneskhm@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

