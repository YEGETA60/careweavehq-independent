
-- PHI acknowledgements
CREATE TABLE public.phi_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  context TEXT NOT NULL DEFAULT 'support',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_phi_ack_user ON public.phi_acknowledgements(user_id, context);
ALTER TABLE public.phi_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own PHI acks"
  ON public.phi_acknowledgements FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users create their own PHI acks"
  ON public.phi_acknowledgements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Support tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  phi_ack_id UUID REFERENCES public.phi_acknowledgements(id),
  redaction_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER support_tickets_set_company_id
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE TRIGGER support_tickets_set_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Users view their own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = created_by);
CREATE POLICY "Staff view company tickets"
  ON public.support_tickets FOR SELECT
  USING (public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[])
         AND (company_id IS NULL OR company_id = public.current_company_id()));
CREATE POLICY "Users create own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Staff update company tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[])
         AND (company_id IS NULL OR company_id = public.current_company_id()));

-- Ticket messages
CREATE TABLE public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL DEFAULT auth.uid(),
  body TEXT NOT NULL,
  redaction_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View ticket messages on own ticket"
  ON public.support_ticket_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid()));
CREATE POLICY "Staff view all ticket messages"
  ON public.support_ticket_messages FOR SELECT
  USING (public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));
CREATE POLICY "Users post on own tickets"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (auth.uid() = author_id AND EXISTS (
    SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid()
  ));
CREATE POLICY "Staff post on company tickets"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (auth.uid() = author_id AND public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));

-- Server-side PHI guard: blocks obvious PHI patterns from being stored.
CREATE OR REPLACE FUNCTION public.reject_phi_in_text()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_text TEXT := COALESCE(NEW.subject,'') || E'\n' || COALESCE(NEW.body,'');
BEGIN
  -- SSN xxx-xx-xxxx
  IF v_text ~ '\m\d{3}-\d{2}-\d{4}\M' THEN
    RAISE EXCEPTION 'PHI_BLOCKED:SSN — Social Security Numbers are not allowed in support content.';
  END IF;
  -- 9-digit raw SSN bare
  IF v_text ~ '\m\d{9}\M' THEN
    RAISE EXCEPTION 'PHI_BLOCKED:SSN — Possible Social Security Number detected.';
  END IF;
  -- MRN-style: MRN <digits>
  IF v_text ~* '\mMRN[:#\s-]*\d{4,}' THEN
    RAISE EXCEPTION 'PHI_BLOCKED:MRN — Medical record numbers are not allowed.';
  END IF;
  -- DOB: DOB MM/DD/YYYY or YYYY-MM-DD with DOB keyword
  IF v_text ~* '\m(DOB|date of birth|born on)\M' THEN
    RAISE EXCEPTION 'PHI_BLOCKED:DOB — Patient dates of birth are not allowed.';
  END IF;
  -- Diagnosis codes ICD-10 letter+digits with dot
  IF v_text ~ '\m[A-TV-Z][0-9][A-Z0-9](\.[A-Z0-9]{1,4})?\M' AND v_text ~* '\m(diagnosis|dx|icd)\M' THEN
    RAISE EXCEPTION 'PHI_BLOCKED:DIAGNOSIS — Patient diagnoses are not allowed.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_tickets_phi_guard
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.reject_phi_in_text();

CREATE OR REPLACE FUNCTION public.reject_phi_in_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_text TEXT := COALESCE(NEW.body,'');
BEGIN
  IF v_text ~ '\m\d{3}-\d{2}-\d{4}\M' OR v_text ~ '\m\d{9}\M' THEN
    RAISE EXCEPTION 'PHI_BLOCKED:SSN';
  END IF;
  IF v_text ~* '\mMRN[:#\s-]*\d{4,}' THEN
    RAISE EXCEPTION 'PHI_BLOCKED:MRN';
  END IF;
  IF v_text ~* '\m(DOB|date of birth|born on)\M' THEN
    RAISE EXCEPTION 'PHI_BLOCKED:DOB';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER support_ticket_messages_phi_guard
  BEFORE INSERT OR UPDATE ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.reject_phi_in_message();
