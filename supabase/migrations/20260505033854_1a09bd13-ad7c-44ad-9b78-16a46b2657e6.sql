ALTER TABLE public.training_completions REPLICA IDENTITY FULL;
ALTER TABLE public.training_assignments REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.training_completions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.training_assignments;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;