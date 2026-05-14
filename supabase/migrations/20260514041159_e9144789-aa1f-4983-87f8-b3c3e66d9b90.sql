-- 1) Set search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ begin new.updated_at = now(); return new; end $$;

-- 2) Revoke EXECUTE on SECURITY DEFINER helpers from anon/authenticated.
-- They are still callable from RLS policies (which run as table owner).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- 3) Scope storage SELECT (listing) on public buckets to authenticated users.
-- Public URLs still work because the bucket is marked public.
DROP POLICY IF EXISTS "public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "public read meals" ON storage.objects;
DROP POLICY IF EXISTS "public read posts" ON storage.objects;

CREATE POLICY "authed list avatars" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "authed list meals" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'meals');
CREATE POLICY "authed list posts" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'posts');