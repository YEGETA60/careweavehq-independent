DROP FUNCTION IF EXISTS public._tmp_exec_ddl(text);
REVOKE ALL ON SCHEMA public FROM sandbox_exec;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM sandbox_exec;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM sandbox_exec;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM sandbox_exec;