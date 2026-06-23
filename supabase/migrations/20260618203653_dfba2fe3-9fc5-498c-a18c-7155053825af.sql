DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'GRANT REFERENCES, SELECT ON auth.users TO sandbox_exec';
    EXECUTE 'GRANT CREATE ON DATABASE postgres TO sandbox_exec';
  END IF;
END $$;
