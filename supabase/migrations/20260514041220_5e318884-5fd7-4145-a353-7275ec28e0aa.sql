DROP POLICY IF EXISTS "authed list avatars" ON storage.objects;
DROP POLICY IF EXISTS "authed list meals" ON storage.objects;
DROP POLICY IF EXISTS "authed list posts" ON storage.objects;

CREATE POLICY "owner list avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owner list meals" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'meals' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owner list posts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);