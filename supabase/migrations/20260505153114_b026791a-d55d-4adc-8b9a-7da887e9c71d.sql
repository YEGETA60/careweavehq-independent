
CREATE TABLE public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_tokens_user ON public.push_tokens(user_id);
CREATE INDEX idx_push_tokens_company ON public.push_tokens(company_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own push tokens"
  ON public.push_tokens FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "company admins view tokens"
  ON public.push_tokens FOR SELECT
  TO authenticated
  USING (company_id IS NOT NULL AND public.is_company_admin(company_id));

CREATE POLICY "tenant_isolation_push_tokens"
  ON public.push_tokens AS RESTRICTIVE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR company_id IS NULL
    OR public.is_member_of_company(company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'superadmin'::app_role)
    OR company_id IS NULL
    OR public.is_member_of_company(company_id)
  );

CREATE TRIGGER push_tokens_company_id_default
  BEFORE INSERT ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
