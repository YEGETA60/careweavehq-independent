
-- Create demo auth user if it doesn't exist
DO $$
DECLARE
  demo_id uuid;
  demo_company uuid := 'aaa9cca1-7b18-4d68-8392-23ae53246af4';
BEGIN
  SELECT id INTO demo_id FROM auth.users WHERE email = 'demo@careweave.app';

  IF demo_id IS NULL THEN
    demo_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      demo_id,
      'authenticated', 'authenticated',
      'demo@careweave.app',
      crypt('CareweaveDemo2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo User"}'::jsonb,
      false, false
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at, last_sign_in_at)
    VALUES (
      gen_random_uuid(), demo_id,
      jsonb_build_object('sub', demo_id::text, 'email', 'demo@careweave.app', 'email_verified', true),
      'email', demo_id::text, now(), now(), now()
    );
  END IF;

  -- Ensure profile
  INSERT INTO public.profiles (id, full_name, default_company_id, onboarding_completed)
  VALUES (demo_id, 'Demo User', demo_company, true)
  ON CONFLICT (id) DO UPDATE SET
    default_company_id = EXCLUDED.default_company_id,
    onboarding_completed = true;

  -- Ensure admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (demo_id, 'admin')
  ON CONFLICT DO NOTHING;

  -- Ensure company membership
  INSERT INTO public.company_users (company_id, user_id, company_role)
  VALUES (demo_company, demo_id, 'admin')
  ON CONFLICT DO NOTHING;
END $$;
