DROP POLICY IF EXISTS "caregiver read own docs" ON storage.objects;
DROP POLICY IF EXISTS "caregiver upload own docs" ON storage.objects;

CREATE POLICY "caregiver read own docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'caregivers'
  AND EXISTS (
    SELECT 1 FROM public.caregivers c
    WHERE c.user_id = auth.uid()
      AND (storage.foldername(objects.name))[2] = (c.id)::text
  )
);

CREATE POLICY "caregiver upload own docs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'caregivers'
  AND EXISTS (
    SELECT 1 FROM public.caregivers c
    WHERE c.user_id = auth.uid()
      AND (storage.foldername(objects.name))[2] = (c.id)::text
  )
);