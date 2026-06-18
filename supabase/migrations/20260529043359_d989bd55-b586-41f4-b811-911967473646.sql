UPDATE storage.buckets
SET
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml'
  ]
WHERE id = 'company-logos';

DROP POLICY IF EXISTS "company-logos insert restricted" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_insert" ON storage.objects;

CREATE POLICY "company-logos insert restricted"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND lower(coalesce(metadata->>'mimetype', '')) IN
      ('image/png','image/jpeg','image/jpg','image/webp','image/svg+xml')
  AND coalesce((metadata->>'size')::bigint, 0) <= 2097152
);

DROP POLICY IF EXISTS "company-logos update restricted" ON storage.objects;

CREATE POLICY "company-logos update restricted"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'company-logos')
WITH CHECK (
  bucket_id = 'company-logos'
  AND lower(coalesce(metadata->>'mimetype', '')) IN
      ('image/png','image/jpeg','image/jpg','image/webp','image/svg+xml')
  AND coalesce((metadata->>'size')::bigint, 0) <= 2097152
);