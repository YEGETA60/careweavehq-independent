-- Care Plan parser tables: support multiple program types (IHSS, CDASS, HCBS, State Plan PC, Private Pay, etc.)

ALTER TABLE public.care_plans
  ADD COLUMN IF NOT EXISTS program_type text,
  ADD COLUMN IF NOT EXISTS program_label text,
  ADD COLUMN IF NOT EXISTS case_manager_name text,
  ADD COLUMN IF NOT EXISTS case_manager_agency text,
  ADD COLUMN IF NOT EXISTS case_manager_phone text,
  ADD COLUMN IF NOT EXISTS medicaid_id text,
  ADD COLUMN IF NOT EXISTS authorization_number text,
  ADD COLUMN IF NOT EXISTS effective_start date,
  ADD COLUMN IF NOT EXISTS effective_end date,
  ADD COLUMN IF NOT EXISTS total_weekly_minutes integer,
  ADD COLUMN IF NOT EXISTS total_weekly_hours numeric(8,2),
  ADD COLUMN IF NOT EXISTS source_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parsed_at timestamptz,
  ADD COLUMN IF NOT EXISTS parser_confidence numeric(4,3),
  ADD COLUMN IF NOT EXISTS parser_raw jsonb;

CREATE TABLE IF NOT EXISTS public.care_plan_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id uuid NOT NULL REFERENCES public.care_plans(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  category_code text,
  weekly_hours_approved numeric(8,2) NOT NULL DEFAULT 0,
  weekly_minutes_approved integer NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_care_plan_categories_plan ON public.care_plan_categories(care_plan_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_categories_company ON public.care_plan_categories(company_id);

CREATE TABLE IF NOT EXISTS public.care_plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id uuid NOT NULL REFERENCES public.care_plans(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.care_plan_categories(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  task_code text,
  minutes_per_task integer NOT NULL DEFAULT 0,
  frequency_per_week numeric(6,2) NOT NULL DEFAULT 0,
  minutes_per_week integer NOT NULL DEFAULT 0,
  notes text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_plan ON public.care_plan_tasks(care_plan_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_cat ON public.care_plan_tasks(category_id);

ALTER TABLE public.care_plan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_plan_tasks ENABLE ROW LEVEL SECURITY;

-- Tenant + role policies (mirror care_plans)
CREATE POLICY "tenant select cpc" ON public.care_plan_categories FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR (company_id IS NOT NULL AND (is_member_of_company(company_id) OR is_family_in_company(company_id))));
CREATE POLICY "scheduler write cpc" ON public.care_plan_categories FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin'::app_role,'scheduler'::app_role]) AND company_id IS NOT NULL AND is_member_of_company(company_id));
CREATE POLICY "scheduler update cpc" ON public.care_plan_categories FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin'::app_role,'scheduler'::app_role]));
CREATE POLICY "admin delete cpc" ON public.care_plan_categories FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "tenant select cpt" ON public.care_plan_tasks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR (company_id IS NOT NULL AND (is_member_of_company(company_id) OR is_family_in_company(company_id))));
CREATE POLICY "scheduler write cpt" ON public.care_plan_tasks FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin'::app_role,'scheduler'::app_role]) AND company_id IS NOT NULL AND is_member_of_company(company_id));
CREATE POLICY "scheduler update cpt" ON public.care_plan_tasks FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin'::app_role,'scheduler'::app_role]));
CREATE POLICY "admin delete cpt" ON public.care_plan_tasks FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

-- Auto-fill company_id from current user
CREATE TRIGGER cpc_set_company BEFORE INSERT ON public.care_plan_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER cpt_set_company BEFORE INSERT ON public.care_plan_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
