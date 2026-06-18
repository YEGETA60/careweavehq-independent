
-- Track sent EVV alerts to prevent duplicates
CREATE TABLE public.evv_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL, -- 'late_clock_in' | 'missed_visit' | 'overtime'
  entity_id text NOT NULL,  -- visit_id or caregiver_id
  period_key text NOT NULL, -- visit_id (visits) or ISO week start date (overtime)
  recipient_email text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX evv_alerts_dedup_idx
  ON public.evv_alerts (alert_type, entity_id, period_key, recipient_email);

ALTER TABLE public.evv_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin view evv alerts"
  ON public.evv_alerts FOR SELECT
  TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin'::app_role, 'scheduler'::app_role]));

-- Inserts/deletes happen via service role (edge function); no policies needed for those.
