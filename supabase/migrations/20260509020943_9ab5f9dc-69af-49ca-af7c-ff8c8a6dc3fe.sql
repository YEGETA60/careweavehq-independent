-- State Aggregator foundation (HHAeXchange / Sandata / Tellus)

CREATE TABLE public.aggregator_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  vendor text NOT NULL CHECK (vendor IN ('hhax','sandata','tellus','authenticare')),
  state text NOT NULL,
  agency_id text,
  provider_id text,
  environment text NOT NULL DEFAULT 'test' CHECK (environment IN ('test','prod')),
  api_base_url text,
  sftp_host text,
  sftp_user text,
  api_key_secret_ref text,           -- name of Supabase secret holding API key
  sftp_key_secret_ref text,          -- name of Supabase secret holding SFTP private key
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','active','error')),
  last_handshake_at timestamptz,
  last_error text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, vendor, state, environment)
);

CREATE INDEX idx_agg_conn_company ON public.aggregator_connections(company_id);

CREATE TABLE public.aggregator_outbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.aggregator_connections(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'visit_create','visit_update','visit_cancel','visit_verify',
    'authorization_create','authorization_update',
    'patient_create','patient_update',
    'employee_create','employee_update'
  )),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sending','sent','accepted','rejected','retry','dead_letter')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  vendor_ack_id text,
  vendor_response jsonb,
  sent_at timestamptz,
  ack_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agg_out_pending ON public.aggregator_outbound_events(status, next_attempt_at)
  WHERE status IN ('pending','retry');
CREATE INDEX idx_agg_out_company ON public.aggregator_outbound_events(company_id, created_at DESC);
CREATE INDEX idx_agg_out_source ON public.aggregator_outbound_events(source_table, source_id);

CREATE TABLE public.aggregator_inbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.aggregator_connections(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  matched_visit_id uuid,
  matched_authorization_id uuid,
  matched_at timestamptz,
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','matched','applied','needs_review','ignored','error')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agg_in_company ON public.aggregator_inbound_events(company_id, created_at DESC);
CREATE INDEX idx_agg_in_unprocessed ON public.aggregator_inbound_events(status) WHERE processed_at IS NULL;

-- Per-visit aggregator status (denormalized for fast queries / claim gating)
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS aggregator_status text
    CHECK (aggregator_status IN ('not_required','pending','sent','accepted','rejected')),
  ADD COLUMN IF NOT EXISTS aggregator_last_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS aggregator_vendor_visit_id text;

-- Payer-level toggle: which payers require aggregator acceptance before billing
ALTER TABLE public.payers
  ADD COLUMN IF NOT EXISTS requires_aggregator boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aggregator_vendor text;

-- Triggers: updated_at
CREATE TRIGGER trg_agg_conn_upd BEFORE UPDATE ON public.aggregator_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_agg_out_upd BEFORE UPDATE ON public.aggregator_outbound_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-set company_id from user
CREATE TRIGGER trg_agg_conn_company BEFORE INSERT ON public.aggregator_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- ============ RLS ============
ALTER TABLE public.aggregator_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregator_outbound_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregator_inbound_events ENABLE ROW LEVEL SECURITY;

-- Connections: only company admins/billing can manage; all members can read status
CREATE POLICY agg_conn_select ON public.aggregator_connections FOR SELECT TO authenticated
  USING (public.is_member_of_company(company_id));
CREATE POLICY agg_conn_write ON public.aggregator_connections FOR ALL TO authenticated
  USING (public.is_company_admin(company_id) OR public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]))
  WITH CHECK (public.is_company_admin(company_id) OR public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));

-- Outbound events: company members read; admins/billing/scheduler can insert (system-generated); admins update
CREATE POLICY agg_out_select ON public.aggregator_outbound_events FOR SELECT TO authenticated
  USING (public.is_member_of_company(company_id));
CREATE POLICY agg_out_insert ON public.aggregator_outbound_events FOR INSERT TO authenticated
  WITH CHECK (public.is_member_of_company(company_id)
    AND public.current_user_has_any_role(ARRAY['admin','billing','scheduler']::app_role[]));
CREATE POLICY agg_out_update ON public.aggregator_outbound_events FOR UPDATE TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));

-- Inbound events: company members read; only admins update/insert (edge function uses service role)
CREATE POLICY agg_in_select ON public.aggregator_inbound_events FOR SELECT TO authenticated
  USING (public.is_member_of_company(company_id));
CREATE POLICY agg_in_admin ON public.aggregator_inbound_events FOR ALL TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin']::app_role[]))
  WITH CHECK (public.current_user_has_any_role(ARRAY['admin']::app_role[]));

-- ============ Helper: enqueue from EVV verify ============
CREATE OR REPLACE FUNCTION public.enqueue_aggregator_visit_event(_visit_id uuid, _event_type text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _v public.visits%ROWTYPE;
  _conn public.aggregator_connections%ROWTYPE;
  _event_id uuid;
  _payer_requires boolean;
BEGIN
  SELECT * INTO _v FROM public.visits WHERE id = _visit_id;
  IF _v.id IS NULL THEN RETURN NULL; END IF;

  -- Does this client's payer require aggregator?
  SELECT p.requires_aggregator INTO _payer_requires
  FROM public.authorizations a
  JOIN public.payers p ON p.id = a.payer_id
  WHERE a.id = _v.authorization_id;

  IF NOT COALESCE(_payer_requires, false) THEN
    UPDATE public.visits SET aggregator_status = 'not_required' WHERE id = _visit_id;
    RETURN NULL;
  END IF;

  -- Find an active connection for this company
  SELECT * INTO _conn FROM public.aggregator_connections
   WHERE company_id = _v.company_id AND status = 'active'
   ORDER BY environment = 'prod' DESC LIMIT 1;
  IF _conn.id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.aggregator_outbound_events
    (company_id, connection_id, event_type, source_table, source_id, payload)
  VALUES
    (_v.company_id, _conn.id, _event_type, 'visits', _visit_id,
     jsonb_build_object('visit_id', _visit_id, 'queued_at', now()))
  RETURNING id INTO _event_id;

  UPDATE public.visits SET aggregator_status = 'pending', aggregator_last_event_at = now()
   WHERE id = _visit_id;

  RETURN _event_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.enqueue_aggregator_visit_event(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_aggregator_visit_event(uuid, text) TO authenticated;