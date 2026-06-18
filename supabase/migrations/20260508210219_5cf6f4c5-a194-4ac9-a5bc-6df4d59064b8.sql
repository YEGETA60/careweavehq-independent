
-- ============= companies (billing provider) =============
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS npi TEXT,
  ADD COLUMN IF NOT EXISTS taxonomy_code TEXT,
  ADD COLUMN IF NOT EXISTS tax_id_type TEXT DEFAULT 'EI',
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS pay_to_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS pay_to_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS pay_to_city TEXT,
  ADD COLUMN IF NOT EXISTS pay_to_state TEXT,
  ADD COLUMN IF NOT EXISTS pay_to_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS edi_submitter_id TEXT,
  ADD COLUMN IF NOT EXISTS edi_test_mode BOOLEAN NOT NULL DEFAULT true;

-- ============= caregivers (rendering provider) =============
ALTER TABLE public.caregivers
  ADD COLUMN IF NOT EXISTS npi TEXT,
  ADD COLUMN IF NOT EXISTS taxonomy_code TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS license_state TEXT;

-- ============= clients (subscriber/patient) =============
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS middle_name TEXT,
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS member_id TEXT,
  ADD COLUMN IF NOT EXISTS subscriber_relationship TEXT DEFAULT '18',
  ADD COLUMN IF NOT EXISTS subscriber_first_name TEXT,
  ADD COLUMN IF NOT EXISTS subscriber_last_name TEXT,
  ADD COLUMN IF NOT EXISTS subscriber_dob DATE,
  ADD COLUMN IF NOT EXISTS subscriber_gender TEXT,
  ADD COLUMN IF NOT EXISTS subscriber_member_id TEXT;

-- ============= payers =============
ALTER TABLE public.payers
  ADD COLUMN IF NOT EXISTS payer_id_electronic TEXT,
  ADD COLUMN IF NOT EXISTS claim_filing_indicator TEXT DEFAULT 'CI',
  ADD COLUMN IF NOT EXISTS submission_address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS submission_address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS submission_city TEXT,
  ADD COLUMN IF NOT EXISTS submission_state TEXT,
  ADD COLUMN IF NOT EXISTS submission_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS companion_guide_profile TEXT DEFAULT 'generic';

-- ============= authorizations =============
ALTER TABLE public.authorizations
  ADD COLUMN IF NOT EXISTS referral_number TEXT,
  ADD COLUMN IF NOT EXISTS clia_number TEXT;

-- ============= claims =============
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS pos_code TEXT DEFAULT '12',
  ADD COLUMN IF NOT EXISTS frequency_code TEXT DEFAULT '1',
  ADD COLUMN IF NOT EXISTS provider_signature_indicator TEXT DEFAULT 'Y',
  ADD COLUMN IF NOT EXISTS assignment_indicator TEXT DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS benefits_assignment_indicator TEXT DEFAULT 'Y',
  ADD COLUMN IF NOT EXISTS release_of_info_code TEXT DEFAULT 'Y',
  ADD COLUMN IF NOT EXISTS surprise_billing_nte TEXT,
  ADD COLUMN IF NOT EXISTS prior_payer_paid NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prior_payer_adjustments JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rendering_caregiver_id UUID REFERENCES public.caregivers(id) ON DELETE SET NULL;

-- ============= claim_lines =============
ALTER TABLE public.claim_lines
  ADD COLUMN IF NOT EXISTS modifier_2 TEXT,
  ADD COLUMN IF NOT EXISTS modifier_3 TEXT,
  ADD COLUMN IF NOT EXISTS modifier_4 TEXT,
  ADD COLUMN IF NOT EXISTS pos_code TEXT DEFAULT '12',
  ADD COLUMN IF NOT EXISTS unit_type TEXT DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS diagnosis_pointers TEXT DEFAULT '1',
  ADD COLUMN IF NOT EXISTS rendering_caregiver_id UUID REFERENCES public.caregivers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS line_note TEXT;

-- ============= claim_diagnoses =============
CREATE TABLE IF NOT EXISTS public.claim_diagnoses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 12),
  icd10_code TEXT NOT NULL,
  poa_indicator TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (claim_id, rank)
);
CREATE INDEX IF NOT EXISTS idx_claim_diagnoses_claim ON public.claim_diagnoses(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_diagnoses_company ON public.claim_diagnoses(company_id);
ALTER TABLE public.claim_diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.claim_diagnoses AS RESTRICTIVE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR (company_id IS NOT NULL AND public.is_member_of_company(company_id)))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR (company_id IS NOT NULL AND public.is_member_of_company(company_id)));
CREATE POLICY "view_diag" ON public.claim_diagnoses FOR SELECT TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','billing','scheduler']::app_role[]));
CREATE POLICY "manage_diag_ins" ON public.claim_diagnoses FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "manage_diag_upd" ON public.claim_diagnoses FOR UPDATE TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "manage_diag_del" ON public.claim_diagnoses FOR DELETE TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE TRIGGER trg_claim_diag_company BEFORE INSERT ON public.claim_diagnoses
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- ============= claim_submissions (audit of generated 837P files) =============
CREATE TABLE IF NOT EXISTS public.claim_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.payers(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT,
  isa_control_number TEXT NOT NULL,
  gs_control_number TEXT NOT NULL,
  st_control_number TEXT NOT NULL,
  claim_count INTEGER NOT NULL DEFAULT 0,
  total_charge NUMERIC NOT NULL DEFAULT 0,
  test_mode BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'generated',
  validation_report JSONB DEFAULT '{}'::jsonb,
  generated_by UUID,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ack_999_status TEXT,
  ack_277ca_status TEXT,
  era_835_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_claim_subs_company ON public.claim_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_claim_subs_payer ON public.claim_submissions(payer_id);
ALTER TABLE public.claim_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.claim_submissions AS RESTRICTIVE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR (company_id IS NOT NULL AND public.is_member_of_company(company_id)))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR (company_id IS NOT NULL AND public.is_member_of_company(company_id)));
CREATE POLICY "view_subs" ON public.claim_submissions FOR SELECT TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "ins_subs" ON public.claim_submissions FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "upd_subs" ON public.claim_submissions FOR UPDATE TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "del_subs" ON public.claim_submissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_claim_subs_company BEFORE INSERT ON public.claim_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_claim_subs_updated BEFORE UPDATE ON public.claim_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= claim_submission_claims (link table) =============
CREATE TABLE IF NOT EXISTS public.claim_submission_claims (
  submission_id UUID NOT NULL REFERENCES public.claim_submissions(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  PRIMARY KEY (submission_id, claim_id)
);
CREATE INDEX IF NOT EXISTS idx_csc_company ON public.claim_submission_claims(company_id);
ALTER TABLE public.claim_submission_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.claim_submission_claims AS RESTRICTIVE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR (company_id IS NOT NULL AND public.is_member_of_company(company_id)))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR (company_id IS NOT NULL AND public.is_member_of_company(company_id)));
CREATE POLICY "view_csc" ON public.claim_submission_claims FOR SELECT TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "ins_csc" ON public.claim_submission_claims FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "del_csc" ON public.claim_submission_claims FOR DELETE TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE TRIGGER trg_csc_company BEFORE INSERT ON public.claim_submission_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- ============= claim_acknowledgments (999, 277CA, 835) =============
CREATE TABLE IF NOT EXISTS public.claim_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.claim_submissions(id) ON DELETE SET NULL,
  ack_type TEXT NOT NULL,
  status TEXT NOT NULL,
  file_name TEXT,
  storage_path TEXT,
  raw_payload TEXT,
  parsed JSONB DEFAULT '{}'::jsonb,
  errors JSONB DEFAULT '[]'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ack_company ON public.claim_acknowledgments(company_id);
CREATE INDEX IF NOT EXISTS idx_ack_submission ON public.claim_acknowledgments(submission_id);
ALTER TABLE public.claim_acknowledgments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.claim_acknowledgments AS RESTRICTIVE TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin') OR (company_id IS NOT NULL AND public.is_member_of_company(company_id)))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR (company_id IS NOT NULL AND public.is_member_of_company(company_id)));
CREATE POLICY "view_ack" ON public.claim_acknowledgments FOR SELECT TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "ins_ack" ON public.claim_acknowledgments FOR INSERT TO authenticated
  WITH CHECK (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "upd_ack" ON public.claim_acknowledgments FOR UPDATE TO authenticated
  USING (public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "del_ack" ON public.claim_acknowledgments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_ack_company BEFORE INSERT ON public.claim_acknowledgments
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

-- ============= storage bucket for claim files =============
INSERT INTO storage.buckets (id, name, public)
VALUES ('claim-files', 'claim-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Billing role view claim files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'claim-files' AND public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "Billing role upload claim files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'claim-files' AND public.current_user_has_any_role(ARRAY['admin','billing']::app_role[]));
CREATE POLICY "Admin delete claim files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'claim-files' AND public.has_role(auth.uid(), 'admin'));
