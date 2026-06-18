CREATE POLICY "Users read own certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own certificates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins manage certificates"
ON storage.objects FOR ALL
USING (bucket_id = 'certificates' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin')))
WITH CHECK (bucket_id = 'certificates' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin')));
