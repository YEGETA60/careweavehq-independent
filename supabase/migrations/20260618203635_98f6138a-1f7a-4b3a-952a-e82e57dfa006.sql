-- Lovable Cloud creates this internal role. Standalone Supabase does not.
-- Keep the historical migration portable without creating a privileged role.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'GRANT ALL ON SCHEMA public TO sandbox_exec';
    EXECUTE 'GRANT ALL ON SCHEMA storage TO sandbox_exec';
    EXECUTE 'GRANT ALL ON SCHEMA extensions TO sandbox_exec';
    EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO sandbox_exec';
    EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO sandbox_exec';
    EXECUTE 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO sandbox_exec';
    EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA storage TO sandbox_exec';
    EXECUTE 'GRANT USAGE ON SCHEMA auth TO sandbox_exec';
    EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA auth TO sandbox_exec';
  END IF;
END $$;
