-- Comprehensive audit log for high-stakes entities (visits, claims, claim_lines)
CREATE TABLE public.entity_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  entity TEXT NOT NULL,           -- 'visits' | 'claims' | 'claim_lines'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,           -- 'insert' | 'update' | 'delete'
  field_changed TEXT,             -- null for pure insert/delete summary rows
  previous_value JSONB,
  new_value JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_entity_audit_entity ON public.entity_audit_log (entity, entity_id, changed_at DESC);
CREATE INDEX idx_entity_audit_company ON public.entity_audit_log (company_id, changed_at DESC);
CREATE INDEX idx_entity_audit_user ON public.entity_audit_log (changed_by, changed_at DESC);

GRANT SELECT ON public.entity_audit_log TO authenticated;
GRANT ALL ON public.entity_audit_log TO service_role;

ALTER TABLE public.entity_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins, managers, billing & supervisors in the same company can read audit history.
CREATE POLICY "Company staff can view their company's audit log"
ON public.entity_audit_log
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (
    company_id IS NOT NULL
    AND public.is_member_of_company(company_id)
    AND public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','billing']::app_role[])
  )
);

-- Only the database (triggers) writes audit rows; no client INSERT/UPDATE/DELETE.

-- Generic audit trigger: emits one row per changed field on UPDATE,
-- plus a single summary row for INSERT/DELETE.
CREATE OR REPLACE FUNCTION public.audit_entity_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _entity TEXT := TG_TABLE_NAME;
  _user UUID := auth.uid();
  _company UUID;
  _old JSONB;
  _new JSONB;
  _key TEXT;
  _old_v JSONB;
  _new_v JSONB;
  -- Ignore noisy or derived fields
  _ignored TEXT[] := ARRAY['updated_at','created_at'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    BEGIN _company := NEW.company_id; EXCEPTION WHEN OTHERS THEN _company := NULL; END;
    INSERT INTO public.entity_audit_log (company_id, entity, entity_id, action, new_value, changed_by)
    VALUES (_company, _entity, NEW.id, 'insert', to_jsonb(NEW), _user);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    BEGIN _company := OLD.company_id; EXCEPTION WHEN OTHERS THEN _company := NULL; END;
    INSERT INTO public.entity_audit_log (company_id, entity, entity_id, action, previous_value, changed_by)
    VALUES (_company, _entity, OLD.id, 'delete', to_jsonb(OLD), _user);
    RETURN OLD;
  ELSE -- UPDATE
    BEGIN _company := NEW.company_id; EXCEPTION WHEN OTHERS THEN _company := NULL; END;
    _old := to_jsonb(OLD);
    _new := to_jsonb(NEW);
    FOR _key IN SELECT jsonb_object_keys(_new) LOOP
      IF _key = ANY(_ignored) THEN CONTINUE; END IF;
      _old_v := _old -> _key;
      _new_v := _new -> _key;
      IF _old_v IS DISTINCT FROM _new_v THEN
        INSERT INTO public.entity_audit_log
          (company_id, entity, entity_id, action, field_changed, previous_value, new_value, changed_by)
        VALUES
          (_company, _entity, NEW.id, 'update', _key, _old_v, _new_v, _user);
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;
END;
$$;

-- Attach to visits, claims, claim_lines
DROP TRIGGER IF EXISTS trg_audit_visits ON public.visits;
CREATE TRIGGER trg_audit_visits
  AFTER INSERT OR UPDATE OR DELETE ON public.visits
  FOR EACH ROW EXECUTE FUNCTION public.audit_entity_changes();

DROP TRIGGER IF EXISTS trg_audit_claims ON public.claims;
CREATE TRIGGER trg_audit_claims
  AFTER INSERT OR UPDATE OR DELETE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.audit_entity_changes();

DROP TRIGGER IF EXISTS trg_audit_claim_lines ON public.claim_lines;
CREATE TRIGGER trg_audit_claim_lines
  AFTER INSERT OR UPDATE OR DELETE ON public.claim_lines
  FOR EACH ROW EXECUTE FUNCTION public.audit_entity_changes();

-- Onboarding wizard progress tracking
CREATE TABLE public.onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE,
  step_agency_info BOOLEAN NOT NULL DEFAULT false,
  step_payer BOOLEAN NOT NULL DEFAULT false,
  step_first_client BOOLEAN NOT NULL DEFAULT false,
  step_first_caregiver BOOLEAN NOT NULL DEFAULT false,
  step_first_shift BOOLEAN NOT NULL DEFAULT false,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_progress TO service_role;

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view their onboarding progress"
ON public.onboarding_progress FOR SELECT TO authenticated
USING (public.is_member_of_company(company_id));

CREATE POLICY "Company admins can insert their onboarding progress"
ON public.onboarding_progress FOR INSERT TO authenticated
WITH CHECK (public.is_company_admin(company_id));

CREATE POLICY "Company admins can update their onboarding progress"
ON public.onboarding_progress FOR UPDATE TO authenticated
USING (public.is_company_admin(company_id));

CREATE TRIGGER trg_onboarding_progress_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();