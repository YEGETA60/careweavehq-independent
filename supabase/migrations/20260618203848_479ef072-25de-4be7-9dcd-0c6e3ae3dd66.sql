CREATE OR REPLACE FUNCTION public._tmp_exec_ddl(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
GRANT EXECUTE ON FUNCTION public._tmp_exec_ddl(text) TO sandbox_exec;