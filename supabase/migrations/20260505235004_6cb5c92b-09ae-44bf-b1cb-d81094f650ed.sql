CREATE TABLE IF NOT EXISTS public.prebill_override_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  reason public.prebill_override_reason NOT NULL,
  role public.app_role NOT NULL,
  max_single_amount numeric(12,2),       -- block single approval over this charge
  max_daily_count integer,               -- per-admin daily approvals for this reason
  max_weekly_amount numeric(12,2),       -- per-admin weekly $ approved for this reason
  requires_second_approver boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, reason, role)
);

CREATE TRIGGER trg_prebill_limits_company BEFORE INSERT ON public.prebill_override_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_prebill_limits_updated BEFORE UPDATE ON public.prebill_override_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.prebill_override_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_prebill_limits ON public.prebill_override_limits AS RESTRICTIVE FOR ALL TO authenticated
  USING (company_id IS NULL OR public.is_member_of_company(company_id))
  WITH CHECK (company_id IS NULL OR public.is_member_of_company(company_id));

CREATE POLICY view_prebill_limits ON public.prebill_override_limits FOR SELECT TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','billing']::app_role[]));

CREATE POLICY manage_prebill_limits ON public.prebill_override_limits FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_any_role(ARRAY['admin','operations_manager']::app_role[]));

CREATE POLICY update_prebill_limits ON public.prebill_override_limits FOR UPDATE TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','operations_manager']::app_role[]))
  WITH CHECK (public.current_user_has_any_role(ARRAY['admin','operations_manager']::app_role[]));

CREATE POLICY delete_prebill_limits ON public.prebill_override_limits FOR DELETE TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin']::app_role[]));

-- Alerts log to dedupe / audit supervisor notifications
CREATE TABLE IF NOT EXISTS public.prebill_override_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  trigger text NOT NULL, -- 'high_value' | 'frequency' | 'limit_exceeded' | 'requires_second_approver'
  acted_by uuid,
  reason public.prebill_override_reason,
  amount numeric(12,2),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  notified_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_prebill_alerts_company BEFORE INSERT ON public.prebill_override_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

ALTER TABLE public.prebill_override_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_prebill_alerts ON public.prebill_override_alerts AS RESTRICTIVE FOR ALL TO authenticated
  USING (company_id IS NULL OR public.is_member_of_company(company_id))
  WITH CHECK (company_id IS NULL OR public.is_member_of_company(company_id));

CREATE POLICY view_prebill_alerts ON public.prebill_override_alerts FOR SELECT TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor','billing']::app_role[]));

CREATE POLICY insert_prebill_alerts ON public.prebill_override_alerts FOR INSERT TO authenticated
  WITH CHECK (true);