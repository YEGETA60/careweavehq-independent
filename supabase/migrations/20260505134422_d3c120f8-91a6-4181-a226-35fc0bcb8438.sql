
-- Employment records
CREATE TABLE public.employment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  job_title TEXT,
  department TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  status TEXT NOT NULL DEFAULT 'active',
  hire_date DATE,
  termination_date DATE,
  termination_reason TEXT,
  supervisor_id UUID,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr view employment" ON public.employment_records FOR SELECT TO authenticated
USING (user_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "hr insert employment" ON public.employment_records FOR INSERT TO authenticated
WITH CHECK (current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "hr update employment" ON public.employment_records FOR UPDATE TO authenticated
USING (current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "admin delete employment" ON public.employment_records FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_employment_updated BEFORE UPDATE ON public.employment_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PTO balances
CREATE TABLE public.pto_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INT NOT NULL,
  accrued_hours NUMERIC NOT NULL DEFAULT 0,
  used_hours NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);
ALTER TABLE public.pto_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view pto balance" ON public.pto_balances FOR SELECT TO authenticated
USING (user_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "manage pto balance ins" ON public.pto_balances FOR INSERT TO authenticated
WITH CHECK (current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "manage pto balance upd" ON public.pto_balances FOR UPDATE TO authenticated
USING (current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "admin delete pto balance" ON public.pto_balances FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pto_bal_updated BEFORE UPDATE ON public.pto_balances
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PTO requests
CREATE TABLE public.pto_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  request_type TEXT NOT NULL DEFAULT 'pto',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pto_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view pto requests" ON public.pto_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "insert own pto request" ON public.pto_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "update pto request" ON public.pto_requests FOR UPDATE TO authenticated
USING ((user_id = auth.uid() AND status = 'pending') OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "admin delete pto request" ON public.pto_requests FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pto_req_updated BEFORE UPDATE ON public.pto_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Disciplinary actions
CREATE TABLE public.disciplinary_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'verbal',
  reason TEXT NOT NULL,
  details TEXT,
  issued_by UUID,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledgment_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.disciplinary_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view disciplinary" ON public.disciplinary_actions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "insert disciplinary" ON public.disciplinary_actions FOR INSERT TO authenticated
WITH CHECK (current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "update disciplinary" ON public.disciplinary_actions FOR UPDATE TO authenticated
USING ((user_id = auth.uid() AND acknowledged_at IS NULL) OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "admin delete disciplinary" ON public.disciplinary_actions FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_disc_updated BEFORE UPDATE ON public.disciplinary_actions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Performance reviews
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reviewer_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  overall_rating INT,
  strengths TEXT,
  improvements TEXT,
  goals TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  reviewer_signed_at TIMESTAMPTZ,
  employee_signed_at TIMESTAMPTZ,
  employee_comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view reviews" ON public.performance_reviews FOR SELECT TO authenticated
USING (user_id = auth.uid() OR reviewer_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "insert reviews" ON public.performance_reviews FOR INSERT TO authenticated
WITH CHECK (current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "update reviews" ON public.performance_reviews FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "admin delete reviews" ON public.performance_reviews FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_review_updated BEFORE UPDATE ON public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Onboarding checklists
CREATE TABLE public.onboarding_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view onboarding" ON public.onboarding_checklists FOR SELECT TO authenticated
USING (user_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "insert onboarding" ON public.onboarding_checklists FOR INSERT TO authenticated
WITH CHECK (current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "update onboarding" ON public.onboarding_checklists FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "admin delete onboarding" ON public.onboarding_checklists FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_onboard_updated BEFORE UPDATE ON public.onboarding_checklists
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
