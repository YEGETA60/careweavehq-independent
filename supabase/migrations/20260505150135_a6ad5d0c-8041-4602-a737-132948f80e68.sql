
CREATE TABLE public.desktop_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  machine_id text NOT NULL,
  machine_name text,
  os text,
  app_version text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, machine_id)
);

CREATE INDEX idx_dlic_company ON public.desktop_licenses(company_id);
CREATE INDEX idx_dlic_user ON public.desktop_licenses(user_id);

CREATE TRIGGER trg_dlic_company BEFORE INSERT ON public.desktop_licenses FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_dlic_updated BEFORE UPDATE ON public.desktop_licenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.desktop_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.desktop_licenses AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin'::app_role) OR (company_id IS NOT NULL AND is_member_of_company(company_id)));

CREATE POLICY view_dlic ON public.desktop_licenses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_company_admin(company_id) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY insert_dlic ON public.desktop_licenses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY update_dlic ON public.desktop_licenses FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_company_admin(company_id) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY delete_dlic ON public.desktop_licenses FOR DELETE TO authenticated
  USING (is_company_admin(company_id) OR has_role(auth.uid(),'admin'::app_role));
