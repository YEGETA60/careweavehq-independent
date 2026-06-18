
-- Audit log
CREATE TABLE public.hr_document_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  document_id uuid REFERENCES public.hr_document_templates(id) ON DELETE SET NULL,
  document_title text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  action text NOT NULL CHECK (action IN ('view','download','update','delete','sign','request_signature','decline_signature','upload')),
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hr_audit_doc ON public.hr_document_audit_log(document_id, created_at DESC);
CREATE INDEX idx_hr_audit_user ON public.hr_document_audit_log(user_id, created_at DESC);
ALTER TABLE public.hr_document_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own audit"
ON public.hr_document_audit_log FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users view own audit"
ON public.hr_document_audit_log FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "managers view all audit"
ON public.hr_document_audit_log FOR SELECT TO authenticated
USING (public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));

-- Signatures
CREATE TABLE public.hr_document_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  document_id uuid REFERENCES public.hr_document_templates(id) ON DELETE CASCADE,
  document_title text,
  signer_id uuid NOT NULL,
  signer_name text,
  signer_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','signed','declined','expired')),
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  signed_at timestamptz,
  signature_image_path text,
  signed_pdf_path text,
  signature_typed_name text,
  ip_address text,
  user_agent text,
  decline_reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hr_sig_signer ON public.hr_document_signatures(signer_id, status);
CREATE INDEX idx_hr_sig_doc ON public.hr_document_signatures(document_id);
ALTER TABLE public.hr_document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signer view own"
ON public.hr_document_signatures FOR SELECT TO authenticated
USING (signer_id = auth.uid());

CREATE POLICY "managers view all sigs"
ON public.hr_document_signatures FOR SELECT TO authenticated
USING (public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));

CREATE POLICY "managers create requests"
ON public.hr_document_signatures FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));

CREATE POLICY "signer self request"
ON public.hr_document_signatures FOR INSERT TO authenticated
WITH CHECK (signer_id = auth.uid());

CREATE POLICY "signer update own"
ON public.hr_document_signatures FOR UPDATE TO authenticated
USING (signer_id = auth.uid())
WITH CHECK (signer_id = auth.uid());

CREATE POLICY "managers update sigs"
ON public.hr_document_signatures FOR UPDATE TO authenticated
USING (public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[]));

CREATE TRIGGER trg_hr_sig_updated BEFORE UPDATE ON public.hr_document_signatures
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage: documents bucket policies (authenticated read; users write own signatures)
CREATE POLICY "auth read documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "users upload own signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'signatures'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "managers upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.current_user_has_any_role(ARRAY['admin','manager','operations_manager','supervisor']::app_role[])
);

-- Link the uploaded handbook
UPDATE public.hr_document_templates
SET file_path = 'handbooks/Professional_Caregiver_Handbook.pdf'
WHERE title = 'Professional Caregiver Handbook';
