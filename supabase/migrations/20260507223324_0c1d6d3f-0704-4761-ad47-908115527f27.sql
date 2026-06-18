
CREATE TABLE IF NOT EXISTS public.hr_document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'compliance',
  required_for_roles app_role[] NOT NULL DEFAULT '{}',
  audience text NOT NULL DEFAULT 'employee',
  reference_url text,
  file_path text,
  mandatory boolean NOT NULL DEFAULT true,
  retention_years integer,
  jurisdiction text,
  tags text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_doc_templates_company ON public.hr_document_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_hr_doc_templates_category ON public.hr_document_templates(category);

ALTER TABLE public.hr_document_templates ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_hr_doc_templates_updated
  BEFORE UPDATE ON public.hr_document_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_hr_doc_templates_company
  BEFORE INSERT ON public.hr_document_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE POLICY "tenant_isolation" ON public.hr_document_templates
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)))
  WITH CHECK (has_role(auth.uid(),'superadmin') OR (company_id IS NOT NULL AND is_member_of_company(company_id)));

CREATE POLICY "view active templates" ON public.hr_document_templates
  FOR SELECT TO authenticated
  USING (active OR current_user_has_any_role(ARRAY['admin','manager','operations_manager']::app_role[]));

CREATE POLICY "manage templates ins" ON public.hr_document_templates
  FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','manager','operations_manager']::app_role[]));

CREATE POLICY "manage templates upd" ON public.hr_document_templates
  FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','manager','operations_manager']::app_role[]));

CREATE POLICY "manage templates del" ON public.hr_document_templates
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));
