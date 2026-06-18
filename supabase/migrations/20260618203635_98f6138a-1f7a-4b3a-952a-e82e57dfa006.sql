GRANT ALL ON SCHEMA public TO sandbox_exec;
GRANT ALL ON SCHEMA storage TO sandbox_exec;
GRANT ALL ON SCHEMA extensions TO sandbox_exec;
GRANT ALL ON ALL TABLES IN SCHEMA public TO sandbox_exec;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO sandbox_exec;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO sandbox_exec;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO sandbox_exec;
GRANT USAGE ON SCHEMA auth TO sandbox_exec;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO sandbox_exec;