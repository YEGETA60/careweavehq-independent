
CREATE TABLE IF NOT EXISTS public.phi_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_roles app_role[] NOT NULL DEFAULT '{}',
  company_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  field_changed text,
  before_value jsonb,
  after_value jsonb,
  ip inet,
  user_agent text,
  request_id text,
  source text NOT NULL DEFAULT 'web',
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_phi_audit_company_time ON public.phi_audit_logs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phi_audit_entity      ON public.phi_audit_logs (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_phi_audit_actor_time  ON public.phi_audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phi_audit_request     ON public.phi_audit_logs (request_id);
CREATE INDEX IF NOT EXISTS idx_phi_audit_action      ON public.phi_audit_logs (action, created_at DESC);

GRANT SELECT ON public.phi_audit_logs TO authenticated;
GRANT ALL    ON public.phi_audit_logs TO service_role;

ALTER TABLE public.phi_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin read phi audit" ON public.phi_audit_logs;
CREATE POLICY "admin read phi audit"
  ON public.phi_audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.phi_audit_block_mutations()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'phi_audit_logs is append-only'; END $$;

DROP TRIGGER IF EXISTS trg_phi_audit_no_update ON public.phi_audit_logs;
CREATE TRIGGER trg_phi_audit_no_update BEFORE UPDATE ON public.phi_audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.phi_audit_block_mutations();
DROP TRIGGER IF EXISTS trg_phi_audit_no_delete ON public.phi_audit_logs;
CREATE TRIGGER trg_phi_audit_no_delete BEFORE DELETE ON public.phi_audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.phi_audit_block_mutations();

CREATE OR REPLACE FUNCTION public._phi_audit_request_meta()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _hdrs jsonb; _ip text;
BEGIN
  BEGIN _hdrs := current_setting('request.headers', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN _hdrs := '{}'::jsonb; END;
  IF _hdrs IS NULL THEN _hdrs := '{}'::jsonb; END IF;
  _ip := COALESCE(split_part(_hdrs->>'x-forwarded-for', ',', 1), _hdrs->>'cf-connecting-ip', _hdrs->>'x-real-ip');
  RETURN jsonb_build_object('ip', NULLIF(trim(_ip), ''), 'user_agent', _hdrs->>'user-agent',
    'request_id', COALESCE(_hdrs->>'x-request-id', _hdrs->>'x-correlation-id'));
END $$;

CREATE OR REPLACE FUNCTION public.log_phi_event(
  p_action text, p_entity text, p_entity_id text DEFAULT NULL,
  p_before jsonb DEFAULT NULL, p_after jsonb DEFAULT NULL,
  p_field text DEFAULT NULL, p_reason text DEFAULT 'treatment',
  p_source text DEFAULT 'web', p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _meta jsonb := public._phi_audit_request_meta(); _roles app_role[];
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT COALESCE(array_agg(role), '{}') INTO _roles FROM public.user_roles WHERE user_id = auth.uid();
  ELSE _roles := '{}'; END IF;
  INSERT INTO public.phi_audit_logs(actor_user_id, actor_roles, company_id, action, entity, entity_id,
    field_changed, before_value, after_value, ip, user_agent, request_id, source, reason, metadata)
  VALUES (auth.uid(), _roles, public.current_company_id(), p_action, p_entity, p_entity_id,
    p_field, p_before, p_after, NULLIF(_meta->>'ip','')::inet, _meta->>'user_agent', _meta->>'request_id',
    COALESCE(p_source,'web'), p_reason, COALESCE(p_metadata,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.log_phi_event(text,text,text,jsonb,jsonb,text,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_phi_event(text,text,text,jsonb,jsonb,text,text,text,jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.audit_phi_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _entity text := TG_TABLE_NAME; _company uuid; _id text;
  _old jsonb; _new jsonb; _meta jsonb := public._phi_audit_request_meta();
  _roles app_role[]; _ignored text[] := ARRAY['updated_at','created_at'];
  _key text; _ov jsonb; _nv jsonb;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT COALESCE(array_agg(role), '{}') INTO _roles FROM public.user_roles WHERE user_id = auth.uid();
  ELSE _roles := '{}'; END IF;

  IF TG_OP = 'INSERT' THEN
    BEGIN _company := NEW.company_id; EXCEPTION WHEN OTHERS THEN _company := public.current_company_id(); END;
    _id := NEW.id::text;
    INSERT INTO public.phi_audit_logs(actor_user_id, actor_roles, company_id, action, entity, entity_id, after_value, ip, user_agent, request_id, source, reason)
    VALUES (auth.uid(), _roles, _company, 'create', _entity, _id, to_jsonb(NEW),
      NULLIF(_meta->>'ip','')::inet, _meta->>'user_agent', _meta->>'request_id', 'trigger', 'treatment');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    BEGIN _company := OLD.company_id; EXCEPTION WHEN OTHERS THEN _company := public.current_company_id(); END;
    _id := OLD.id::text;
    INSERT INTO public.phi_audit_logs(actor_user_id, actor_roles, company_id, action, entity, entity_id, before_value, ip, user_agent, request_id, source, reason)
    VALUES (auth.uid(), _roles, _company, 'delete', _entity, _id, to_jsonb(OLD),
      NULLIF(_meta->>'ip','')::inet, _meta->>'user_agent', _meta->>'request_id', 'trigger', 'treatment');
    RETURN OLD;
  ELSE
    BEGIN _company := NEW.company_id; EXCEPTION WHEN OTHERS THEN _company := public.current_company_id(); END;
    _id := NEW.id::text; _old := to_jsonb(OLD); _new := to_jsonb(NEW);
    FOR _key IN SELECT jsonb_object_keys(_new) LOOP
      IF _key = ANY(_ignored) THEN CONTINUE; END IF;
      _ov := _old -> _key; _nv := _new -> _key;
      IF _ov IS DISTINCT FROM _nv THEN
        INSERT INTO public.phi_audit_logs(actor_user_id, actor_roles, company_id, action, entity, entity_id, field_changed, before_value, after_value, ip, user_agent, request_id, source, reason)
        VALUES (auth.uid(), _roles, _company, 'update', _entity, _id, _key, _ov, _nv,
          NULLIF(_meta->>'ip','')::inet, _meta->>'user_agent', _meta->>'request_id', 'trigger', 'treatment');
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;
EXCEPTION WHEN OTHERS THEN
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;

DO $$
DECLARE t text;
  phi_tables text[] := ARRAY['clients','caregivers','visits','intakes','credentials','invoices','claims','claim_lines','authorizations','timesheets','timesheet_signatures','messages','message_attachments','employment_records'];
BEGIN
  FOREACH t IN ARRAY phi_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_phi_audit_%I ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_phi_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_phi_changes()', t, t);
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='data_retention_policies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='companies') THEN
    INSERT INTO public.data_retention_policies (company_id, entity, retention_years, enabled)
    SELECT id, 'phi_audit_logs', 10, true FROM public.companies
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Backfill
INSERT INTO public.phi_audit_logs (created_at, actor_user_id, action, entity, entity_id, metadata, source, reason)
SELECT created_at, user_id, action, entity, entity_id, COALESCE(metadata,'{}'::jsonb), 'legacy_audit_log', 'operations'
FROM public.audit_log;

INSERT INTO public.phi_audit_logs (created_at, actor_user_id, company_id, action, entity, entity_id, metadata, reason, source)
SELECT created_at, user_id, company_id, action, entity,
       CASE WHEN entity_id IS NULL THEN NULL ELSE entity_id::text END,
       COALESCE(metadata,'{}'::jsonb), COALESCE(reason,'treatment'), 'legacy_phi_access_log'
FROM public.phi_access_log;

INSERT INTO public.phi_audit_logs (created_at, actor_user_id, company_id, action, entity, entity_id, field_changed, before_value, after_value, source, reason)
SELECT changed_at, changed_by, company_id, action, entity,
       CASE WHEN entity_id IS NULL THEN NULL ELSE entity_id::text END,
       field_changed, previous_value, new_value, 'legacy_entity_audit_log', 'treatment'
FROM public.entity_audit_log;

COMMENT ON TABLE public.phi_audit_logs IS 'Append-only HIPAA PHI audit trail. Writes via log_phi_event() RPC or audit_phi_changes() trigger only. Admin read-only. 10-year retention.';
COMMENT ON TABLE public.audit_log IS 'DEPRECATED — superseded by phi_audit_logs.';
COMMENT ON TABLE public.phi_access_log IS 'DEPRECATED — superseded by phi_audit_logs.';
COMMENT ON TABLE public.entity_audit_log IS 'DEPRECATED — superseded by phi_audit_logs.';
