-- This temporary helper was used only by Lovable's internal sandbox role.
DO $outer$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE $ddl$
      CREATE OR REPLACE FUNCTION public._tmp_exec_ddl(sql text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $function$
      BEGIN
        EXECUTE sql;
      END;
      $function$
    $ddl$;
    EXECUTE 'REVOKE ALL ON FUNCTION public._tmp_exec_ddl(text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public._tmp_exec_ddl(text) TO sandbox_exec';
  END IF;
END $outer$;
