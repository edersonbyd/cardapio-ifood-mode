
CREATE POLICY "produtos storage public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'produtos');

CREATE POLICY "produtos storage admin insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'produtos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "produtos storage admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'produtos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "produtos storage admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'produtos' AND public.has_role(auth.uid(), 'admin'));
