DO $$
DECLARE
  owner_name text;
BEGIN
  SELECT nspowner::regrole::text INTO owner_name FROM pg_namespace WHERE nspname='auth';
  RAISE NOTICE 'auth schema owner: %', owner_name;
  RAISE NOTICE 'current_user: %', current_user;
END $$;
GRANT USAGE ON SCHEMA auth TO sandbox_exec;
GRANT SELECT, REFERENCES ON auth.users TO sandbox_exec;