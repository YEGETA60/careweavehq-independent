
-- Create public bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read
CREATE POLICY "Company logos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Authenticated company members can upload to their company's folder (folder name = company_id)
CREATE POLICY "Company members can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND public.is_company_admin(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Company members can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND public.is_company_admin(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Company members can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND public.is_company_admin(((storage.foldername(name))[1])::uuid)
);
