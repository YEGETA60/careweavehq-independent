
-- 1. Add 'family' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'family';

-- 2. client_users: link auth users to clients (family portal)
CREATE TABLE IF NOT EXISTS public.client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  relationship text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_family_of_client(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.client_users WHERE user_id = auth.uid() AND client_id = _client_id) $$;

CREATE POLICY "admin manage client_users" ON public.client_users FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "view own link" ON public.client_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- 3. documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  doc_type text NOT NULL DEFAULT 'general',
  client_id uuid,
  caregiver_id uuid,
  care_plan_id uuid,
  credential_id uuid,
  intake_id uuid,
  uploaded_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff view docs" ON public.documents FOR SELECT TO authenticated
  USING (
    current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[])
    OR (caregiver_id IS NOT NULL AND EXISTS(SELECT 1 FROM caregivers c WHERE c.id = documents.caregiver_id AND c.user_id = auth.uid()))
    OR (client_id IS NOT NULL AND public.is_family_of_client(client_id))
  );
CREATE POLICY "staff insert docs" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[])
    OR (caregiver_id IS NOT NULL AND EXISTS(SELECT 1 FROM caregivers c WHERE c.id = documents.caregiver_id AND c.user_id = auth.uid()))
  );
CREATE POLICY "admin update docs" ON public.documents FOR UPDATE TO authenticated
  USING (current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY "admin delete docs" ON public.documents FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 4. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  category text DEFAULT 'general',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own notif" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "update own notif" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "admin insert notif" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[]) OR user_id = auth.uid());
CREATE POLICY "admin delete notif" ON public.notifications FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- 5. storage bucket for documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies: admin/scheduler/billing full; caregivers their folder; family their client's folder
CREATE POLICY "staff read docs storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[]));
CREATE POLICY "staff write docs storage" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND current_user_has_any_role(ARRAY['admin','scheduler','billing']::app_role[]));
CREATE POLICY "staff update docs storage" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND current_user_has_any_role(ARRAY['admin','scheduler']::app_role[]));
CREATE POLICY "admin delete docs storage" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "caregiver read own docs" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND
    EXISTS(SELECT 1 FROM caregivers c WHERE c.user_id = auth.uid() AND (storage.foldername(name))[1] = 'caregivers' AND (storage.foldername(name))[2] = c.id::text)
  );
CREATE POLICY "caregiver upload own docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS(SELECT 1 FROM caregivers c WHERE c.user_id = auth.uid() AND (storage.foldername(name))[1] = 'caregivers' AND (storage.foldername(name))[2] = c.id::text)
  );
CREATE POLICY "family read client docs" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = 'clients' AND
    public.is_family_of_client(((storage.foldername(name))[2])::uuid)
  );
