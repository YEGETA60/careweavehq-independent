DROP FUNCTION IF EXISTS public._tmp_exec_ddl(text);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA public FROM sandbox_exec';
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM sandbox_exec';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM sandbox_exec';
    EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM sandbox_exec';
  END IF;
END $$;
