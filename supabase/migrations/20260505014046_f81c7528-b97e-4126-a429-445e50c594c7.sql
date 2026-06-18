
CREATE TABLE public.reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type text NOT NULL,
  entity_id text NOT NULL,
  period_key text NOT NULL,
  recipient_email text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX reminder_log_unique
  ON public.reminder_log (reminder_type, entity_id, period_key, recipient_email);

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin view reminder log"
  ON public.reminder_log
  FOR SELECT
  TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin'::app_role, 'scheduler'::app_role]));
